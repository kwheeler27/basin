"""Privacy gate (WATER_RIGHTS_DESIGN.md D6, principle 3): published rights
artifacts may never carry an individual's name. This runs in CI against the
COMMITTED artifacts — the gate is enforcement, not editorial care.
"""
import json
from pathlib import Path

from basin_ingest.rights.pipeline import classify_owner

GEO = Path(__file__).resolve().parents[2].parent / "apps" / "web" / "public" / "geo"


def _owners():
    d = json.loads((GEO / "rights_owner_agg.json").read_text())
    for lst in d["states"].values():
        yield from lst
    for lst in d["counties"].values():
        yield from lst


def test_owner_artifact_exists_and_versioned():
    d = json.loads((GEO / "rights_owner_agg.json").read_text())
    assert d["schema_version"] == "rights-v1"
    assert d["states"], "owners artifact is empty"


def test_no_individual_names_published():
    bad = []
    for o in _owners():
        cls = classify_owner(o["name"])
        if cls == "individual":
            bad.append(o["name"])
        assert o["class"] in ("entity", "public", "tribal_govt")
    assert not bad, f"individual-classified names in published artifact: {bad[:5]}"


def test_county_agg_carries_no_name_fields():
    d = json.loads((GEO / "rights_county_agg.json").read_text())
    forbidden = {"owner", "owner_name_raw", "name", "holder"}
    for c in d["counties"]:
        assert not (forbidden & set(c.keys())), f"name-like field in county agg: {c.keys()}"
