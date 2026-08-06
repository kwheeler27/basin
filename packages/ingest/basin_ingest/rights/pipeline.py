"""Water-rights pipeline — fetch, normalize, aggregate (rights-v1).

Implements WATER_RIGHTS_DESIGN.md Phase 1 for CO / AZ / NM / CA:

    python -m basin_ingest.rights.pipeline fetch co|az|nm|ca|counties
    python -m basin_ingest.rights.pipeline normalize     (DuckDB → parquet)
    python -m basin_ingest.rights.pipeline aggregate     (→ web artifacts)

Raw snapshots land in data/rights/raw/ (repo-root data/ is gitignored;
object-storage upload is the retention path). Artifacts land in
apps/web/public/geo/ and are committed — the PR diff is the refresh.

Source semantics (from the agency atlas + probes, 2026-08-06):
  CO  CDSS netamount: appropriationDate = priority; decreedUses is a
      string of HydroBase single-char use codes; county authoritative.
  AZ  Filing_POD: PRIOR_DT = priority (certificated/permitted filings);
      no county field → point-in-county against TIGERweb polygons.
  NM  OSE POD CSV: well-registry-shaped; NO defensible priority column —
      NM contributes counts/uses/ownership; Seniority renders NM as a
      coverage gap (gaps are content, never silently zero).
  CA  SWRCB POD flat file (CKAN bulk CSV — the agency's own portal;
      the ArcGIS front door is WAF'd intermittently): PRIORITY_DATE,
      COUNTY, PRIMARY_OWNER_ENTITY_TYPE supplied directly.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3].parent  # repo root
RAW = ROOT / "data" / "rights" / "raw"
OUT_PARQUET = ROOT / "data" / "rights" / "rights_normalized.parquet"
WEB_GEO = ROOT / "apps" / "web" / "public" / "geo"
UA = "Mozilla/5.0 (compatible; basin-project-pipeline; +kwheeler27@gmail.com)"
TODAY = date.today().isoformat()

STATE_FIPS = {"az": "04", "ca": "06", "co": "08", "nm": "35", "nv": "32", "ut": "49", "wy": "56"}


def _get(url: str, timeout: int = 120) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _stream_to(url: str, dest: Path, timeout: int = 600) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    n = 0
    with urllib.request.urlopen(req, timeout=timeout) as r, open(dest, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
            n += len(chunk)
    return n


# ---------------------------------------------------------------- fetchers
def fetch_co() -> None:
    """CDSS netamount, statewide, paged. ~180k rows @ pageSize 1000."""
    base = "https://dwr.state.co.us/Rest/GET/api/v2/waterrights/netamount/?format=json&pageSize=1000&pageIndex={i}"
    dest = RAW / f"co_netamount_{TODAY}.jsonl"
    with open(dest, "w") as f:
        i, total = 1, None
        while True:
            d = json.loads(_get(base.format(i=i)))
            total = d["PageCount"]
            for row in d["ResultList"]:
                f.write(json.dumps(row) + "\n")
            print(f"co page {i}/{total}", flush=True)
            if i >= total:
                break
            i += 1
            time.sleep(0.4)
    print(f"co done → {dest}")


def fetch_az() -> None:
    """ADWR Filing_POD FeatureServer, paged by resultOffset."""
    base = (
        "https://services.arcgis.com/C34zQ7veRS0V1t04/arcgis/rest/services/Filing_POD/FeatureServer/0/query"
        "?where=1%3D1&outFields=PROGRAM,APPNO,CONVNO,FILENO,PARENTAPP,STATUS,WATERSOURCE,"
        "USE_FOR_1,USE_FOR_2,USE_FOR_3,H20_AMT_1,H20_UNITS_1,APPNAME,PRIOR_DT,X_UTMNAD83,Y_UTMNAD83"
        "&returnGeometry=false&resultRecordCount=2000&resultOffset={off}&f=json"
    )
    dest = RAW / f"az_filing_pod_{TODAY}.jsonl"
    with open(dest, "w") as f:
        off = 0
        while True:
            d = json.loads(_get(base.format(off=off)))
            feats = d.get("features", [])
            if not feats:
                break
            for ft in feats:
                f.write(json.dumps(ft["attributes"]) + "\n")
            off += len(feats)
            print(f"az offset {off}", flush=True)
            time.sleep(0.4)
    print(f"az done → {dest}")


def fetch_nm() -> None:
    url = "https://opendata.arcgis.com/api/v3/datasets/ce5ed29e2849411098ee66f1c226af12_0/downloads/data?format=csv&spatialRefId=4326"
    dest = RAW / f"nm_pod_{TODAY}.csv"
    n = _stream_to(url, dest)
    if n < 50_000_000:
        raise SystemExit(f"nm download suspiciously small ({n} bytes) — expected ~150MB")
    print(f"nm done → {dest} ({n/1e6:.0f}MB)")


def fetch_ca() -> None:
    """data.ca.gov's CDN 403s python-urllib TLS fingerprints regardless of
    UA — curl transport instead (same precedent as the OpenET bake)."""
    import subprocess
    url = "https://data.ca.gov/dataset/1c2117f4-e4be-47f7-9eb5-81b086aefe34/resource/835fb642-3cc7-468c-ba1b-caa9a3884151/download/ewrims_flat_file_pod-flat-file.csv"
    dest = RAW / f"ca_pod_{TODAY}.csv"
    subprocess.run(["curl", "-sL", "--max-time", "600", "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", url, "-o", str(dest)], check=True)
    n = dest.stat().st_size
    if n < 10_000_000:
        raise SystemExit(f"ca download suspiciously small ({n} bytes)")
    print(f"ca done → {dest} ({n/1e6:.0f}MB)")


def fetch_counties() -> None:
    """TIGERweb county polygons for the seven states (display + AZ assignment)."""
    fips = ",".join(f"'{v}'" for v in STATE_FIPS.values())
    url = (
        "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/11/query"
        f"?where=STATE+IN+({fips})&outFields=GEOID,BASENAME,STATE&outSR=4326"
        "&geometryPrecision=3&maxAllowableOffset=0.01&f=geojson"
    )
    feats = []
    off = 0
    while True:
        d = json.loads(_get(url + f"&resultRecordCount=100&resultOffset={off}", timeout=300))
        got = d.get("features", [])
        feats.extend(got)
        if len(got) < 100:
            break
        off += len(got)
    # AZ 15 + CA 58 + CO 64 + NM 33 + NV 17 + UT 29 + WY 23 = 239 exactly.
    if len(feats) != 239:
        raise SystemExit(f"counties fetch expected 239, got {len(feats)}")
    d = {"type": "FeatureCollection", "features": feats}
    (RAW / "counties7.geojson").write_text(json.dumps(d))
    # slim display copy
    slim = {
        "type": "FeatureCollection",
        "source": "US Census Bureau TIGERweb, State_County (generalized ~1km)",
        "fetched": TODAY,
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "fips": f["properties"]["GEOID"],
                    "name": f["properties"]["BASENAME"],
                    "st": f["properties"]["STATE"],
                },
                "geometry": f["geometry"],
            }
            for f in d["features"]
        ],
    }
    out = WEB_GEO / "counties_west.json"
    out.write_text(json.dumps(slim, separators=(",", ":")))
    print(f"counties: {len(d['features'])} → {out} ({out.stat().st_size/1e6:.1f}MB)")


# ------------------------------------------------------- az county assign
def _point_in_ring(lon: float, lat: float, ring: list) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _county_locator(state_fips: str):
    d = json.loads((RAW / "counties7.geojson").read_text())
    polys = []
    for f in d["features"]:
        if f["properties"]["STATE"] != state_fips:
            continue
        g = f["geometry"]
        rings = g["coordinates"] if g["type"] == "Polygon" else [r for p in g["coordinates"] for r in p]
        outer = [g["coordinates"][0]] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
        xs = [pt[0] for ring in outer for pt in ring]
        ys = [pt[1] for ring in outer for pt in ring]
        polys.append((f["properties"]["GEOID"], f["properties"]["BASENAME"], outer,
                      (min(xs), min(ys), max(xs), max(ys))))

    def locate(lon: float, lat: float):
        for geoid, name, outers, (x0, y0, x1, y1) in polys:
            if lon < x0 or lon > x1 or lat < y0 or lat > y1:
                continue
            for ring in outers:
                if _point_in_ring(lon, lat, ring):
                    return geoid, name
        return None, None

    return locate


# ------------------------------------------------------------- normalize
CO_USE_CODES = {  # HydroBase single-character decreed-use codes
    "0": "storage_use", "1": "irrigation", "2": "municipal", "3": "other",
    "4": "industrial", "5": "recreation", "6": "fish_wildlife", "7": "other",
    "8": "domestic", "9": "stockwater",
}
ENTITY_PAT = (
    "LLC|L\\.L\\.C|INC\\b|CORP|COMPANY|CO\\.|LTD|L\\.P|LLP|PARTNERS|FARMS\\b|RANCHES\\b|"
    "DISTRICT|ASSOCIATION|ASSN|CANAL|DITCH|IRRIGATION|WATER USERS|MUTUAL|CHURCH|UNIVERSITY|SCHOOL"
)
PUBLIC_PAT = (
    "CITY OF|TOWN OF|COUNTY|STATE OF|UNITED STATES|U\\.S\\.|USDA|USDI|BUREAU|DEPT|DEPARTMENT|"
    "AUTHORITY|CONSERVANCY|MUNICIPAL|FEDERAL|NATIONAL|FOREST SERVICE|BLM\\b"
)
TRIBAL_PAT = "TRIBE|TRIBAL|NATION\\b|INDIAN COMMUNITY|PUEBLO OF"


import re as _re

_TRIBAL_RE = _re.compile(TRIBAL_PAT)
_PUBLIC_RE = _re.compile(PUBLIC_PAT)
_ENTITY_RE = _re.compile(ENTITY_PAT)


def classify_owner(name: str | None) -> str:
    """Conservative entity classification (WATER_RIGHTS_DESIGN.md D6).
    The publication gate and the CI privacy test share this function —
    a name is publishable only if it classifies AWAY from individual."""
    if not name or not name.strip():
        return "unknown"
    u = " ".join(name.upper().split())
    if _TRIBAL_RE.search(u):
        return "tribal_govt"
    if _PUBLIC_RE.search(u):
        return "public"
    if _ENTITY_RE.search(u):
        return "entity"
    return "individual"


def normalize() -> None:
    import duckdb

    con = duckdb.connect()
    co = sorted(RAW.glob("co_netamount_*.jsonl"))[-1]
    az = sorted(RAW.glob("az_filing_pod_*.jsonl"))[-1]
    nm = sorted(RAW.glob("nm_pod_*.csv"))[-1]
    ca = sorted(RAW.glob("ca_pod_*.csv"))[-1]

    # AZ county assignment (no county in source) — pure-python ray cast.
    locate = _county_locator(STATE_FIPS["az"])
    az_rows = []
    utm = _utm12_to_lonlat
    for line in open(az):
        r = json.loads(line)
        lon, lat = (None, None)
        if r.get("X_UTMNAD83") and r.get("Y_UTMNAD83"):
            lon, lat = utm(float(r["X_UTMNAD83"]), float(r["Y_UTMNAD83"]))
        geoid, cname = locate(lon, lat) if lon else (None, None)
        r["_lon"], r["_lat"], r["_fips"], r["_county"] = lon, lat, geoid, cname
        az_rows.append(r)
    az_tmp = RAW / "az_located.jsonl"
    with open(az_tmp, "w") as f:
        for r in az_rows:
            f.write(json.dumps(r) + "\n")
    print(f"az located: {sum(1 for r in az_rows if r['_fips'])}/{len(az_rows)} in-county")

    ent = f"""CASE
        WHEN owner IS NULL OR owner = '' THEN 'unknown'
        WHEN regexp_matches(upper(owner), '{TRIBAL_PAT}') THEN 'tribal_govt'
        WHEN regexp_matches(upper(owner), '{PUBLIC_PAT}') THEN 'public'
        WHEN regexp_matches(upper(owner), '{ENTITY_PAT}') THEN 'entity'
        ELSE 'individual' END"""

    con.execute(f"""
    CREATE TABLE rights AS
    -- Colorado: CDSS net amounts
    WITH co_raw AS (
      SELECT * FROM read_json_auto('{co}', format='newline_delimited', union_by_name=true)
    ), co AS (
      SELECT 'co:cdss_netamount:' || wdid || ':' || COALESCE(CAST(waterRightNetAmtNum AS VARCHAR),'0') AS right_uid,
        'co' AS state, 'cdss_netamount' AS source_system, CAST(wdid AS VARCHAR) AS source_id,
        longitude AS lon, latitude AS lat,
        CASE WHEN latitude IS NOT NULL THEN 'gis' ELSE 'missing' END AS loc_quality,
        substr(CAST(appropriationDate AS VARCHAR),1,10) AS priority_date,
        'decreed' AS priority_basis,
        CAST(decreedUses AS VARCHAR) AS use_raw,
        CASE WHEN COALESCE(netAbsolute,0) > 0 THEN netAbsolute ELSE NULL END AS quantity_value,
        CASE WHEN decreedUnits = 'C' THEN 'cfs' WHEN decreedUnits = 'A' THEN 'af' ELSE NULL END AS quantity_unit,
        CASE WHEN decreedUnits = 'C' THEN 'rate' WHEN decreedUnits = 'A' THEN 'volume_storage' ELSE NULL END AS quantity_kind,
        NULL AS owner, county AS county_name, upper(county) AS county_key, NULL AS fips, NULL AS owner_entity_src,
        'active' AS status_class, NULL AS status_raw
      FROM co_raw WHERE wdid IS NOT NULL
    ),
    -- Arizona: Filing_POD with assigned counties
    az AS (
      SELECT 'az:adwr_filing_pod:' || FILENO AS right_uid,
        'az' AS state, 'adwr_filing_pod' AS source_system, FILENO AS source_id,
        _lon AS lon, _lat AS lat,
        CASE WHEN _lon IS NOT NULL THEN 'gis' ELSE 'missing' END AS loc_quality,
        CASE WHEN regexp_matches(CAST(PRIOR_DT AS VARCHAR), '^[0-9]{{4}}-') THEN substr(CAST(PRIOR_DT AS VARCHAR),1,10)
             WHEN regexp_matches(CAST(PRIOR_DT AS VARCHAR), '^[0-9]{{1,2}}/') THEN substr(CAST(try_strptime(CAST(PRIOR_DT AS VARCHAR), '%-m/%-d/%Y') AS VARCHAR),1,10)
        END AS priority_date,
        CASE WHEN STATUS LIKE '%CERT%' THEN 'certificated' ELSE 'permitted' END AS priority_basis,
        COALESCE(CAST(USE_FOR_1 AS VARCHAR),'') AS use_raw,
        NULL AS quantity_value, NULL AS quantity_unit, NULL AS quantity_kind,
        APPNAME AS owner, _county AS county_name, _fips AS county_key, _fips AS fips, NULL AS owner_entity_src,
        CASE WHEN upper(STATUS) LIKE 'ACTIVE%' THEN 'active'
             WHEN upper(STATUS) LIKE 'INACTIVE%' THEN 'inactive' ELSE 'unknown' END AS status_class,
        STATUS AS status_raw
      FROM read_json_auto('{az_tmp}', format='newline_delimited', union_by_name=true)
      WHERE FILENO IS NOT NULL
    ),
    -- New Mexico: OSE POD (no priority — coverage gap on seniority, by design)
    nm AS (
      SELECT 'nm:nmose_pod:' || basin || '-' || nbr || COALESCE(suffix,'') AS right_uid,
        'nm' AS state, 'nmose_pod' AS source_system, basin || '-' || nbr AS source_id,
        CASE WHEN lon_deg IS NOT NULL AND lon_deg != 0 THEN -(abs(lon_deg) + lon_min/60.0 + lon_sec/3600.0) END AS lon,
        CASE WHEN lat_deg IS NOT NULL AND lat_deg != 0 THEN lat_deg + lat_min/60.0 + lat_sec/3600.0 END AS lat,
        CASE WHEN lat_deg IS NOT NULL AND lat_deg != 0 THEN 'gis' ELSE 'missing' END AS loc_quality,
        NULL AS priority_date, 'permitted' AS priority_basis,
        COALESCE(use_,'') AS use_raw,
        NULL AS quantity_value, NULL AS quantity_unit, NULL AS quantity_kind,
        trim(COALESCE(own_lname,'') || ' ' || COALESCE(own_fname,'')) AS owner,
        county AS county_name, upper(county) AS county_key, NULL AS fips, NULL AS owner_entity_src,
        CASE WHEN upper(COALESCE(pod_status,'')) = 'ACT' THEN 'active' ELSE 'unknown' END AS status_class,
        pod_status AS status_raw
      FROM read_csv('{nm}', header=true, all_varchar=false, ignore_errors=true, types={{'lat_deg':'DOUBLE','lat_min':'DOUBLE','lat_sec':'DOUBLE','lon_deg':'DOUBLE','lon_min':'DOUBLE','lon_sec':'DOUBLE'}})
      WHERE basin IS NOT NULL
    ),
    -- California: SWRCB POD flat file
    ca AS (
      SELECT 'ca:swrcb_pod:' || CAST(POD_ID AS VARCHAR) AS right_uid,
        'ca' AS state, 'swrcb_pod' AS source_system, CAST(POD_ID AS VARCHAR) AS source_id,
        LONGITUDE AS lon, LATITUDE AS lat,
        CASE WHEN LATITUDE IS NOT NULL THEN 'gis' ELSE 'missing' END AS loc_quality,
        CASE WHEN regexp_matches(CAST(PRIORITY_DATE AS VARCHAR), '^[0-9]{{4}}-') THEN substr(CAST(PRIORITY_DATE AS VARCHAR),1,10)
             WHEN regexp_matches(CAST(PRIORITY_DATE AS VARCHAR), '^[0-9]{{1,2}}/') THEN substr(CAST(try_strptime(CAST(PRIORITY_DATE AS VARCHAR), '%-m/%-d/%Y') AS VARCHAR),1,10)
        END AS priority_date,
        CASE WHEN WATER_RIGHT_TYPE LIKE '%Statement%' THEN 'claimed'
             WHEN WATER_RIGHT_TYPE LIKE '%Registration%' THEN 'registered'
             ELSE 'permitted' END AS priority_basis,
        COALESCE(WATER_RIGHT_TYPE,'') AS use_raw,
        NULL AS quantity_value, NULL AS quantity_unit, NULL AS quantity_kind,
        APPLICATION_PRIMARY_OWNER AS owner,
        CASE PRIMARY_OWNER_ENTITY_TYPE
          WHEN 'Individual' THEN 'individual'
          WHEN 'Trust' THEN 'individual'
          WHEN 'Estate' THEN 'individual'
          WHEN 'Partnership or Co-owners' THEN 'individual'
          WHEN 'Receivership/Fiduciary' THEN 'individual'
          WHEN 'Corporation' THEN 'entity'
          WHEN 'Limited Liability Company' THEN 'entity'
          WHEN 'Organization/Association' THEN 'entity'
          WHEN 'Limited Partner' THEN 'entity'
          WHEN 'Joint Venture' THEN 'entity'
          WHEN 'Government (State/Municipal)' THEN 'public'
          WHEN 'Federal Government' THEN 'public'
        END AS owner_entity_src,
        COUNTY AS county_name, upper(COUNTY) AS county_key, NULL AS fips,
        CASE WHEN upper(COALESCE(WATER_RIGHT_STATUS,'')) IN ('ACTIVE','LICENSED','PERMITTED','CLAIMED') THEN 'active'
             WHEN upper(COALESCE(WATER_RIGHT_STATUS,'')) IN ('CANCELLED','REVOKED','REJECTED','CLOSED','INACTIVE') THEN 'inactive'
             ELSE 'unknown' END AS status_class,
        WATER_RIGHT_STATUS AS status_raw
      FROM read_csv('{ca}', header=true, ignore_errors=true, sample_size=200000)
      WHERE POD_ID IS NOT NULL
    ),
    unioned AS (
      SELECT * FROM co UNION ALL BY NAME SELECT * FROM az
      UNION ALL BY NAME SELECT * FROM nm UNION ALL BY NAME SELECT * FROM ca
    )
    SELECT *, COALESCE(owner_entity_src, {ent}) AS owner_entity_class FROM unioned
    """)
    # FIPS post-pass: NM uses 2-letter county codes and some CA rows carry
    # no county — assign by geometry wherever we have coordinates.
    pending = con.execute(
        "SELECT right_uid, state, lon, lat FROM rights WHERE fips IS NULL AND lon IS NOT NULL AND lat IS NOT NULL"
    ).fetchall()
    locators = {st: _county_locator(STATE_FIPS[st]) for st in {r[1] for r in pending}}
    fixes = []
    for uid, st, lon, lat in pending:
        geoid, cname = locators[st](lon, lat)
        if geoid:
            fixes.append((uid, geoid, cname))
    con.execute("CREATE TEMP TABLE fixes (right_uid VARCHAR, fips VARCHAR, cname VARCHAR)")
    con.executemany("INSERT INTO fixes VALUES (?, ?, ?)", fixes)
    con.execute("""UPDATE rights SET fips = f.fips, county_key = f.fips, county_name = f.cname
                   FROM fixes f WHERE rights.right_uid = f.right_uid""")
    print(f"fips post-pass: {len(fixes)}/{len(pending)} located by geometry")

    # Name pass for rows with a county name but no coordinates (CO/CA tails).
    counties_d = json.loads((RAW / "counties7.geojson").read_text())
    inv = {v: k for k, v in STATE_FIPS.items()}
    n2f = {(inv[f["properties"]["STATE"]], f["properties"]["BASENAME"].upper()): f["properties"]["GEOID"]
           for f in counties_d["features"]}
    named = con.execute(
        "SELECT DISTINCT state, county_key FROM rights WHERE fips IS NULL AND county_key IS NOT NULL"
    ).fetchall()
    nfix = [(st, ck, n2f[(st, ck.strip().upper())]) for st, ck in named if (st, (ck or "").strip().upper()) in n2f]
    con.execute("CREATE TEMP TABLE nfix (state VARCHAR, ck VARCHAR, fips VARCHAR)")
    con.executemany("INSERT INTO nfix VALUES (?, ?, ?)", nfix)
    con.execute("""UPDATE rights SET fips = nfix.fips FROM nfix
                   WHERE rights.fips IS NULL AND rights.state = nfix.state AND rights.county_key = nfix.ck""")
    print(f"name pass: {len(nfix)} county names mapped")

    n = con.execute("SELECT count(*), count(DISTINCT state) FROM rights").fetchone()
    per = con.execute("SELECT state, count(*) FROM rights GROUP BY 1 ORDER BY 1").fetchall()
    print("normalized:", n, per)
    OUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    con.execute(f"COPY rights TO '{OUT_PARQUET}' (FORMAT parquet)")
    print(f"→ {OUT_PARQUET} ({OUT_PARQUET.stat().st_size/1e6:.1f}MB)")


def _utm12_to_lonlat(x: float, y: float) -> tuple:
    """UTM zone 12N (NAD83) → lon/lat. Standard TM inverse, pure python."""
    import math
    a, f = 6378137.0, 1 / 298.257222101
    e2 = f * (2 - f)
    k0, E0, lon0 = 0.9996, 500000.0, math.radians(-111.0)
    M = y / k0
    mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi = (mu + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
           + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
           + (151 * e1**3 / 96) * math.sin(6 * mu))
    sin_p, cos_p, tan_p = math.sin(phi), math.cos(phi), math.tan(phi)
    ep2 = e2 / (1 - e2)
    C = ep2 * cos_p**2
    T = tan_p**2
    N = a / math.sqrt(1 - e2 * sin_p**2)
    R = a * (1 - e2) / (1 - e2 * sin_p**2) ** 1.5
    D = (x - E0) / (N * k0)
    lat = phi - (N * tan_p / R) * (D**2 / 2 - (5 + 3 * T + 10 * C - 4 * C**2 - 9 * ep2) * D**4 / 24
                                  + (61 + 90 * T + 298 * C + 45 * T**2 - 252 * ep2 - 3 * C**2) * D**6 / 720)
    lon = lon0 + (D - (1 + 2 * T + C) * D**3 / 6
                  + (5 - 2 * C + 28 * T - 3 * C**2 + 8 * ep2 + 24 * T**2) * D**5 / 120) / cos_p
    return math.degrees(lon), math.degrees(lat)


# ------------------------------------------------------------- aggregate
def aggregate() -> None:
    import duckdb

    con = duckdb.connect()
    con.execute(f"CREATE VIEW r AS SELECT * FROM read_parquet('{OUT_PARQUET}')")

    # county-name → GEOID for CO/NM/CA (source gives names; TIGER gives fips)
    counties = json.loads((RAW / "counties7.geojson").read_text())
    name_to_fips = {}
    for ft in counties["features"]:
        p = ft["properties"]
        st = {v: k for k, v in STATE_FIPS.items()}[p["STATE"]]
        name_to_fips[(st, p["BASENAME"].upper())] = p["GEOID"]

    rows = con.execute("""
      SELECT state, any_value(county_name) AS county_key, fips,
        count(*) AS n,
        CAST(median(CAST(substr(priority_date,1,4) AS INT)) AS INT) AS med_yr,
        round(100.0 * count(*) FILTER (WHERE priority_date IS NOT NULL AND priority_date < '1922-01-01')
              / NULLIF(count(*) FILTER (WHERE priority_date IS NOT NULL),0), 1) AS pct_pre1922,
        count(*) FILTER (WHERE priority_date IS NOT NULL) AS n_dated,
        count(*) FILTER (WHERE owner_entity_class IN ('entity','public','tribal_govt')) AS n_entity_held
      FROM r WHERE (fips IS NOT NULL OR county_key IS NOT NULL) AND status_class != 'inactive'
      GROUP BY 1,3
    """).fetchall()

    # use mix per county (top-level classes via per-state raw mapping)
    use_rows = con.execute("""
      SELECT state, fips, use_raw, count(*) FROM r
      WHERE fips IS NOT NULL AND status_class != 'inactive'
      GROUP BY 1,2,3
    """).fetchall()

    def map_use(state: str, raw: str) -> str:
        raw = (raw or "").strip().upper()
        if not raw:
            return "unknown"
        if state == "co":
            classes = {CO_USE_CODES.get(ch, "other") for ch in raw if ch in CO_USE_CODES}
            for pref in ("irrigation", "municipal", "domestic", "stockwater", "storage_use"):
                if pref in classes:
                    return pref
            return next(iter(classes), "other")
        table = {
            "IRR": "irrigation", "IRRIGATION": "irrigation", "DOM": "domestic", "DOMESTIC": "domestic",
            "MUN": "municipal", "MUNICIPAL": "municipal", "STK": "stockwater", "STOCK": "stockwater",
            "IND": "industrial", "COM": "industrial", "MIN": "mining", "REC": "recreation",
            "SAN": "domestic", "EXP": "other", "MDW": "domestic",
        }
        if state == "ca":
            if "STATEMENT" in raw:
                return "unknown"  # CA use classes live elsewhere; type ≠ use
            return "unknown"
        for k, v in table.items():
            if raw.startswith(k):
                return v
        return "other"

    from collections import defaultdict
    uses = defaultdict(lambda: defaultdict(int))
    for st, ck, raw, n in use_rows:
        uses[(st, ck)][map_use(st, raw)] += n

    out_counties = []
    matched = 0
    for st, ck, fips, n, med, pct, n_dated, n_ent in rows:
        f = fips or name_to_fips.get((st, (ck or "").upper()))
        if f:
            matched += n
        out_counties.append({
            "fips": f, "state": st, "county": ck, "n": n,
            "medianPriorityYear": med, "pctPre1922": pct, "nDated": n_dated,
            "entityHeldShare": round(n_ent / n, 3) if n else None,
            "uses": dict(sorted(uses[(st, f)].items(), key=lambda kv: -kv[1])[:6]),
        })

    totals = dict(con.execute("SELECT state, count(*) FROM r GROUP BY 1").fetchall())
    meta = {
        "schema_version": "rights-v1",
        "fetched": TODAY,
        "states": {
            "co": {"n": totals.get("co", 0), "seniority": True, "source": "Colorado DWR, CDSS net amounts (decreed rights)"},
            "az": {"n": totals.get("az", 0), "seniority": True, "source": "Arizona DWR, surface-water Filing_POD (ArcGIS)"},
            "nm": {"n": totals.get("nm", 0), "seniority": False, "seniorityNote": "NM POD file records no defensible priority date — shown as coverage gap", "source": "New Mexico OSE, points of diversion (bulk)"},
            "ca": {"n": totals.get("ca", 0), "seniority": True, "source": "California SWRCB, eWRIMS POD flat file (data.ca.gov)"},
            "ut": {"n": 0, "coverage": "trackers-only", "note": "geometry access pending (AGENCY_ATLAS)"},
            "nv": {"n": 0, "coverage": "not-scriptable", "note": "ASP.NET postback search only"},
            "wy": {"n": 0, "coverage": "offline", "note": "paper/notarized filings only"},
        },
        "counties": out_counties,
    }
    # ---- owners artifact (Phase 2): entity/public/tribal holders ONLY.
    # Double gate: parquet class must be non-individual AND classify_owner
    # must agree — a name reaches the artifact only if both say entity.
    raw_owners = con.execute("""
      SELECT state, fips, owner, owner_entity_class, count(*) AS n
      FROM r WHERE owner IS NOT NULL AND trim(owner) != '' AND fips IS NOT NULL
        AND status_class != 'inactive'
        AND owner_entity_class IN ('entity','public','tribal_govt')
      GROUP BY 1,2,3,4
    """).fetchall()
    from collections import defaultdict as _dd
    by_state, by_county = _dd(lambda: _dd(lambda: [0, "", set()])), _dd(list)
    for st, f, name, cls, n in raw_owners:
        key = " ".join(name.upper().split())
        if classify_owner(key) == "individual":
            continue  # the belt-and-suspenders publication gate
        agg_entry = by_state[st][key]
        agg_entry[0] += n
        agg_entry[1] = cls
        agg_entry[2].add(f)
        by_county[f].append((key, cls, n))
    owners_states = {
        st: [
            {"name": k, "class": v[1], "n": v[0], "counties": len(v[2])}
            for k, v in sorted(m.items(), key=lambda kv: -kv[1][0])[:12]
        ]
        for st, m in by_state.items()
    }
    owners_counties = {}
    for f, lst in by_county.items():
        merged = _dd(lambda: [0, ""])
        for k, cls, n in lst:
            merged[k][0] += n
            merged[k][1] = cls
        owners_counties[f] = [
            {"name": k, "class": v[1], "n": v[0]}
            for k, v in sorted(merged.items(), key=lambda kv: -kv[1][0])[:3]
        ]
    owners_out = {
        "schema_version": "rights-v1",
        "fetched": TODAY,
        "note": "Holders of record in state filings — entities, agencies, and tribal governments only; individual holders are aggregated in county statistics and never named. Name strings are as filed (no entity resolution across spellings). Holder of record is not beneficial ownership.",
        "states": owners_states,
        "counties": owners_counties,
    }
    oout = WEB_GEO / "rights_owner_agg.json"
    oout.write_text(json.dumps(owners_out, separators=(",", ":")))
    print(f"owners: {sum(len(v) for v in owners_states.values())} state-level, {len(owners_counties)} counties → {oout} ({oout.stat().st_size/1024:.0f}KB)")

    out = WEB_GEO / "rights_county_agg.json"
    out.write_text(json.dumps(meta, separators=(",", ":")))
    print(f"aggregate: {len(out_counties)} county bins, {matched} rows fips-matched → {out} ({out.stat().st_size/1024:.0f}KB)")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    RAW.mkdir(parents=True, exist_ok=True)
    if cmd == "fetch":
        {"co": fetch_co, "az": fetch_az, "nm": fetch_nm, "ca": fetch_ca, "counties": fetch_counties}[sys.argv[2]]()
    elif cmd == "normalize":
        normalize()
    elif cmd == "aggregate":
        aggregate()
    else:
        raise SystemExit("usage: pipeline.py fetch <co|az|nm|ca|counties> | normalize | aggregate")
