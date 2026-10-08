# Truchet Weaver

An interactive generative art tool that weaves maze-like patterns from
**Truchet tiles** — square tiles decorated so their connections stay
consistent at every boundary, producing continuous, never-breaking
strands across the whole grid.

## Features

- Four tile styles: quarter arcs, semicircles, diagonals, mixed
- Live controls: grid size, stroke width, hue, hue spread, background
- Seed-based generation (click canvas or "Reseed" to shuffle)
- Animated "weave-in" reveal
- Save artwork as PNG

## Run

Pure static HTML/JS — no build, no dependencies:

```bash
# open index.html directly, or serve the folder:
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Concept

Each tile randomly picks one of two orientations. Because a quarter-arc
tile always connects the same pair of adjacent edge midpoints regardless
of orientation, neighboring arcs join seamlessly — turning thousands of
independent random choices into long, flowing woven paths.
