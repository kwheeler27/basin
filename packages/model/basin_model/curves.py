"""Storage <-> elevation curves, self-calibrated from paired RISE observations.

Reclamation's area-capacity tables are the authority, but they are published
as documents; rather than transcribe them, we fit monotone piecewise-linear
curves to 26 years of paired monthly (storage, elevation) observations from
the same primary source. Within the observed range this IS the operative
curve; outside it we extrapolate linearly and say so.
"""

from __future__ import annotations

import json
from pathlib import Path

_DATA = Path(__file__).parent.parent / "data" / "model_inputs.json"


class Curve:
    """Monotone piecewise-linear y(x) with linear extrapolation."""

    def __init__(self, pairs: list[tuple[float, float]]):
        # average duplicate x, then enforce monotone y by sorting on x
        from collections import defaultdict
        acc: dict[float, list[float]] = defaultdict(list)
        for x, y in pairs:
            acc[round(x, -3)].append(y)  # bin storage to 1-kaf grid
        pts = sorted((x, sum(ys) / len(ys)) for x, ys in acc.items())
        # drop non-monotone wiggles (measurement noise): keep running max
        clean: list[tuple[float, float]] = []
        for x, y in pts:
            if not clean or y > clean[-1][1]:
                clean.append((x, y))
        if len(clean) < 10:
            raise ValueError("not enough paired observations for a curve")
        self.xs = [p[0] for p in clean]
        self.ys = [p[1] for p in clean]

    def __call__(self, x: float) -> float:
        xs, ys = self.xs, self.ys
        if x <= xs[0]:
            i = 0
        elif x >= xs[-1]:
            i = len(xs) - 2
        else:
            lo, hi = 0, len(xs) - 1
            while hi - lo > 1:
                mid = (lo + hi) // 2
                if xs[mid] <= x:
                    lo = mid
                else:
                    hi = mid
            i = lo
        x0, x1 = xs[i], xs[i + 1]
        y0, y1 = ys[i], ys[i + 1]
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0)

    def inverse(self, y: float) -> float:
        """x at a given y (storage at a given elevation). Valid because the
        curve is strictly monotone; linear extrapolation outside the range,
        mirroring __call__."""
        xs, ys = self.xs, self.ys
        if y <= ys[0]:
            i = 0
        elif y >= ys[-1]:
            i = len(ys) - 2
        else:
            lo, hi = 0, len(ys) - 1
            while hi - lo > 1:
                mid = (lo + hi) // 2
                if ys[mid] <= y:
                    lo = mid
                else:
                    hi = mid
            i = lo
        x0, x1 = xs[i], xs[i + 1]
        y0, y1 = ys[i], ys[i + 1]
        return x0 + (x1 - x0) * (y - y0) / (y1 - y0)

    @property
    def observed_range(self) -> tuple[float, float]:
        return self.xs[0], self.xs[-1]


def load_curves() -> dict[str, Curve]:
    d = json.loads(_DATA.read_text())
    out = {}
    for rid, elev_key, stor_key in (
        ("powell", "powellElev", "powellStorage"),
        ("mead", "meadElev", "meadStorage"),
    ):
        pairs = [
            (s, e)
            for s, e in zip(d[stor_key], d[elev_key])
            if s is not None and e is not None
        ]
        out[rid] = Curve(pairs)
    return out


def load_inputs() -> dict:
    return json.loads(_DATA.read_text())
