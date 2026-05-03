# path-polygon-lab

Research lab for converting SVG paths into optimized polygon output.

This app is a separate experimental project. It is **not** part of `CSS-3D-ReactObjectEngine`, but it was created to validate lower-level ideas for the future CSS3D path pipeline.

The main goal is to transform an SVG path into a clean `finalPolygon` that can later be saved as JSON / generated asset and consumed by a runtime CSS3D engine.

```txt
SVG path
  ↓
@remotion/paths parse/reduce
  ↓
reduced M / L / C / Z instructions
  ↓
adaptive curve sampling
  ↓
feature-aware optimization
  ↓
normalized finalPolygon
  ↓
saved JSON / generated asset
  ↓
runtime CSS3D geometry
```

## Core idea

SVG path processing should be an **authoring/build-time step**, not a runtime rendering task.

The runtime CSS3D engine should not repeatedly parse or calculate SVG paths. It should receive an already prepared polygon:

```ts
[
  { x: 0, y: 0 },
  { x: 10.25, y: 4.5 },
  { x: 20, y: 0 },
];
```

## Current status

The lab has successfully validated the current polygonization direction:

- `@remotion/paths` is used for SVG path parsing and reduction.
- `reduceInstructions()` normalizes paths to `M / L / C / Z`.
- Straight line segments keep only endpoints.
- Curves are sampled adaptively.
- `Мінімальний приріст, %` controls how aggressively curve points are reduced.
- Cosine / feature detection helps preserve important curve points.
- Final output coordinates are normalized to 2 decimal places.
- Preview supports toggling path, polygon, and vertex numbers.

This state is considered the canonical research result for the current lab stage.

## Tech stack

- Vite
- React
- TypeScript
- Emotion
- `@remotion/paths`

## Install

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Lint

```bash
pnpm lint
```

## UI overview

The app has a sidebar and a playground.

### Sidebar

The sidebar contains:

- SVG path input
- `Мінімальний приріст, %`
- Recalculate button
- Console output button
- Statistics:
  - path length
  - raw output points
  - final polygon nodes
  - removed / normalized points
  - whether path is closed by `Z/z`

### Playground

The playground shows one large SVG preview with layers:

- original SVG path
- raw sampled polyline
- final polygon
- vertex dots
- vertex labels

The preview header has toggles:

- `Path`
- `Polygon`
- `Numbers`

## Algorithm overview

### 1. Path normalization

The input SVG path is first parsed and reduced by `@remotion/paths`:

```ts
const parsed = parsePath(pathData);
const reduced = reduceInstructions(parsed);
```

After reduction, the polygonization algorithm only needs to handle:

```txt
M
L
C
Z
```

This means commands such as `H`, `V`, `Q`, `A`, relative commands, and shorthand commands are normalized by Remotion before our own algorithm runs.

### 2. Line handling

Line segments are simple:

```txt
L → keep endpoint only
```

No extra points are generated for straight lines.

### 3. Curve handling

Cubic curves are processed through adaptive sampling.

For each curve:

```txt
C
  ↓
calculate curve length
  ↓
resolve adaptive reference segment count
  ↓
sample dense curve points
  ↓
detect important feature points
  ↓
split curve by forced feature points
  ↓
filter each slice by minimal scalar increment
```

The user does not control the internal sampling count directly.

Instead, the user controls:

```txt
Мінімальний приріст, %
```

This value determines the minimal scalar distance from the last accepted anchor point before a new curve node is accepted.

### 4. Feature detection

The current experimental feature detection uses:

- coordinate extrema
- cosine local minima
- cosine sign changes

This helps preserve important curve parts that would otherwise be skipped by a simple linear step algorithm.

### 5. Polyline optimization

After sampling, the app removes:

- adjacent duplicate points
- closing duplicate point
- strictly collinear middle points

Closed and open paths are handled differently:

- open paths preserve endpoints
- closed paths are processed cyclically

### 6. Output normalization

Final output coordinates are normalized for export:

```txt
20.000000000000004    → 20
29.999999999999996    → 30
66.5685424949238      → 66.57
6.123233995736766e-17 → 0
-0                    → 0
```

The algorithm itself still works with full JavaScript `number` precision internally.

Only the final output polygon is rounded.

## Console output

The Console button prints:

- final polygon JSON
- detected curve features
- Remotion parsed/reduced instructions

This is useful for validating how `@remotion/paths` transforms complex SVG commands.

Example paths to test:

```txt
M 0 0 C 32 14 44 9 0 12 Z
```

```txt
M 0 0 H 10 L 12 2 A 1 1 0 0 1 10 9 V 5 Q 8 2 6 5 Q 3 10 0 5 Z
```

```txt
M 50 60 A 30 30 0 1 1 49.999 60 Z
```

## Important architectural decision

The app intentionally delegates SVG command normalization to `@remotion/paths`.

This project should not grow into a custom SVG parser.

The boundary is:

```txt
@remotion/paths:
  parse SVG syntax
  reduce commands
  normalize arcs/quadratics/etc. into cubic form

path-polygon-lab:
  sample reduced geometry
  detect important curve features
  optimize polygon points
  produce clean finalPolygon
```

## Known future concerns

### Very short polygon edges

Very short edges must be treated carefully before moving this logic into production CSS3D geometry.

In the future CSS3D engine, every polygon edge may create a side surface. Extremely short surfaces can break visual patterns, materials, or shading.

A later production pipeline should include:

```txt
min edge length guard
geometry budget diagnostics
safe post-pass cleanup
```

### Feature detection is still experimental

The current cosine / extrema feature detection works well on tested curves, but it should still be considered a research result, not a mathematically complete universal solution.

## Project structure

```txt
src/
  App.tsx
  main.tsx

  shared/
    types/
      geometry.ts

  features/
    path-lab/
      PathLab.tsx

      components/
        PathControlsPanel/
        PathLabLayout/
        PathPreviewPanel/

      constants/
        defaultPathLabState.ts

      logic/
        computePathLabResult.ts
        curveSamplingConfig.ts
        filterCurveSamplesByStep.ts
        inspectRemotionInstructions.ts
        normalizeOutputPolygon.ts
        optimizePolyline.ts
        pathClosure.ts
        pathViewBox.ts
        polygonSvg.ts
        samplePath.ts

      types/
        pathLabTypes.ts
```

## Canonical output

The final useful artifact of this lab is the normalized `finalPolygon`.

Example:

```json
[
  { "x": 0, "y": 0 },
  { "x": 5.48, "y": 2.3 },
  { "x": 11.96, "y": 4.76 },
  { "x": 18.44, "y": 6.97 },
  { "x": 24.12, "y": 8.7 },
  { "x": 28.67, "y": 10.34 },
  { "x": 27.66, "y": 10.59 },
  { "x": 20.76, "y": 10.91 },
  { "x": 13.81, "y": 11.2 },
  { "x": 7.02, "y": 11.56 },
  { "x": 0, "y": 12 }
]
```

This polygon can later be moved into a JSON asset or constant and passed to the CSS3D runtime.

## License

Private research project.
