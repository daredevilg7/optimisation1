#!/usr/bin/env python3
"""Build clean, accurate SVG function plots from the site's optimization data."""

from __future__ import annotations

import argparse
import html
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "plots"
WIDTH, HEIGHT = 680, 320
PLOT = {"left": 58, "right": 18, "top": 18, "bottom": 40}
DATA_SCRIPT = r"""
const core = require('./dist/solver.js');
const data = core.variants.map(v => {
  const reference = core.reference(v);
  const samples = Array.from({length: 401}, (_, i) => {
    const x = v.a + (v.b - v.a) * i / 400;
    return {x, y: v.f(x)};
  });
  return {id: v.id, plain: v.plain, a: v.a, b: v.b, samples, reference};
});
process.stdout.write(JSON.stringify(data));
"""


def source_data() -> list[dict]:
    result = subprocess.run(
        ["node", "-e", DATA_SCRIPT], cwd=ROOT, check=True, capture_output=True, text=True
    )
    return json.loads(result.stdout)


def chart_scale(variant: dict) -> dict:
    samples = variant["samples"]
    values = [point["y"] for point in samples]
    values.extend(point["y"] for point in variant["reference"]["candidates"])
    low, high = min(values), max(values)
    padding = (high - low) * 0.12 or 1
    return {
        "width": WIDTH,
        "height": HEIGHT,
        **PLOT,
        "xMin": variant["a"],
        "xMax": variant["b"],
        "yMin": low - padding,
        "yMax": high + padding,
    }


def render_svg(variant: dict) -> str:
    scale = chart_scale(variant)
    x_span = scale["xMax"] - scale["xMin"]
    y_span = scale["yMax"] - scale["yMin"]

    def sx(x: float) -> float:
        return scale["left"] + (x - scale["xMin"]) / x_span * (WIDTH - scale["left"] - scale["right"])

    def sy(y: float) -> float:
        return HEIGHT - scale["bottom"] - (y - scale["yMin"]) / y_span * (HEIGHT - scale["top"] - scale["bottom"])

    left, right = scale["left"], WIDTH - scale["right"]
    top, bottom = scale["top"], HEIGHT - scale["bottom"]
    y_ticks = [scale["yMin"] + y_span * i / 4 for i in range(5)]
    x_ticks = [scale["xMin"] + x_span * i / 4 for i in range(5)]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title description">',
        f'<title id="title">График варианта {variant["id"]}: f(x) = {html.escape(variant["plain"])}</title>',
        '<desc id="description">График функции на заданном отрезке. Золотая отметка показывает глобальный минимум.</desc>',
        '<rect width="100%" height="100%" fill="#fff"/>',
    ]
    for value in y_ticks:
        y = sy(value)
        parts.append(f'<line x1="{left}" y1="{y:.2f}" x2="{right}" y2="{y:.2f}" stroke="#e4e7eb" stroke-width="1"/>')
        parts.append(f'<text x="{left - 9}" y="{y + 4:.2f}" text-anchor="end" class="tick">{value:.4g}</text>')
    for value in x_ticks:
        x = sx(value)
        parts.append(f'<line x1="{x:.2f}" y1="{top}" x2="{x:.2f}" y2="{bottom}" stroke="#eef0f2" stroke-width="1"/>')
        parts.append(f'<text x="{x:.2f}" y="{bottom + 19}" text-anchor="middle" class="tick">{value:.4g}</text>')
    path = " ".join(
        f'{"M" if index == 0 else "L"}{sx(point["x"]):.2f},{sy(point["y"]):.2f}'
        for index, point in enumerate(variant["samples"])
    )
    minimum = variant["reference"]
    min_x, min_y = sx(minimum["x"]), sy(minimum["y"])
    parts.extend([
        f'<line x1="{left}" y1="{bottom}" x2="{right}" y2="{bottom}" stroke="#525960" stroke-width="1.2"/>',
        f'<line x1="{left}" y1="{top}" x2="{left}" y2="{bottom}" stroke="#525960" stroke-width="1.2"/>',
        f'<path d="{path}" fill="none" stroke="#315f83" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>',
        f'<line x1="{min_x:.2f}" y1="{min_y:.2f}" x2="{min_x:.2f}" y2="{bottom}" stroke="#a16a19" stroke-width="1" stroke-dasharray="4 4"/>',
        f'<circle cx="{min_x:.2f}" cy="{min_y:.2f}" r="4.5" fill="#a16a19" stroke="#fff" stroke-width="1.5"><title>x* = {minimum["x"]:.8g}, f(x*) = {minimum["y"]:.8g}</title></circle>',
        f'<text x="{min_x + 7:.2f}" y="{max(top + 12, min_y - 8):.2f}" class="minimum">x* = {minimum["x"]:.4g}</text>',
        f'<text x="{right}" y="{HEIGHT - 5}" text-anchor="end" class="axis-label">x</text>',
        f'<text x="13" y="{top + 2}" class="axis-label">f(x)</text>',
        '<style>.tick{font:12px Arial,sans-serif;fill:#626a73}.axis-label{font:13px Arial,sans-serif;fill:#343a40}.minimum{font:12px Arial,sans-serif;fill:#805312}</style>',
        '</svg>',
    ])
    return "\n".join(parts) + "\n"


def generated_files(data: list[dict]) -> dict[Path, str]:
    files = {
        OUTPUT / f'variant-{variant["id"]:02}.svg': render_svg(variant)
        for variant in data
    }
    scales = {str(variant["id"]): chart_scale(variant) for variant in data}
    files[OUTPUT / "scales.js"] = f"window.OptimizationPlotScales = {json.dumps(scales, ensure_ascii=False, indent=2)};\n"
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if committed plots are out of date")
    args = parser.parse_args()
    files = generated_files(source_data())
    stale = []
    for path, content in files.items():
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                stale.append(path.relative_to(ROOT))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
    if stale:
        print("Графики не совпадают с текущими функциями:")
        print("\n".join(str(path) for path in stale))
        return 1
    print(f"Графики проверены: {len(files) - 1} вариантов")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
