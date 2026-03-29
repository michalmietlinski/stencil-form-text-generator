# Stencil / form generator

Generate **STL** plates with text **cut from solid stock** (not raised letters): **stencil** mode cuts **through** the full plate thickness; **form** mode cuts a **blind pocket** to a chosen depth (mm). Core: [JSCAD](https://github.com/jscad/OpenJSCAD.org) booleans + [opentype.js](https://opentype.js.org/).

## Features

- **Stencil** — through-holes for spray/craft stencils; only **bundled OFL stencil fonts** (allowlist in code).
- **Form** — pocket depth &lt; plate thickness; **any** TTF/OTF in `fonts/` or via URL.
- **Layout** — `combined` (one plate) or `separate` (one plate per letter; deduplicated).
- **CLI** — JSON input; optional bulk charset export per font (**form** mode).
- **Web** — static UI in `web/`; `npm run build-web` syncs fonts into `docs/` for GitHub Pages.

## Installation

```bash
cd stencil-form-generator
npm install
```

## CLI

```bash
node src/cli/index.js --input examples/example-form.json --output output/text.stl
node src/cli/index.js --input examples/example-stencil.json --output output/stencil.stl
```

**Stencil** example must use an allowlist font (e.g. `StardosStencil-Bold`). **Form** examples use `pocketDepth` and `plateThickness` with `productMode: "form"`.

Batch **a–z, A–Z, 0–9** as separate STLs, one folder per font (defaults: 3 mm pocket / 4 mm plate for form; through cut for stencil):

```bash
npm run generate-base-forms
npm run generate-base-stencils
```

- **`generate-base-forms`** → `output/base-alphabet-forms/` — **form** (pocket), every font under `fonts/`.
- **`generate-base-stencils`** → `output/base-alphabet-stencils/` — **stencil** (through cut), **allowlist stencil fonts only**.

Optional: `--fonts Name1,Name2` or `--limit 10`, `--product-mode form|stencil`, `--pocketDepth`, `--plateThickness`.

Full multilingual charset (form mode, all fonts):

```bash
npm run generate-full-set -- --output output/alphabet-all-fonts
```

## JSON parameters (`generateFontToSTL`)

| Parameter | Description |
|-----------|-------------|
| `productMode` | `"stencil"` (through cut) or `"form"` (pocket) |
| `plateThickness` | Stock thickness (mm) |
| `platePadding` | Margin around text on the plate (mm) |
| `pocketDepth` | Form mode only: cut depth from top (mm), must be ≤ `plateThickness` |
| `characterHeight` | Text size in the plane (mm) |
| `mode` | `combined` or `separate` |
| `spacing` | Letter spacing in `combined` mode (mm) |
| `fontName` | File in `fonts/` without extension |

**Stencil fonts (OFL, names match files in `fonts/`):** `StardosStencil-Bold`, `StardosStencil-Regular`, `AllertaStencil-Regular`, `SairaStencilOne-Regular`, `BlackOpsOne-Regular`.

Legacy **rectangle plate** JSON (`rectangleWidth`, `thickness`, …) still uses `generate()` with `productMode` + `pocketDepth` for cut-from-plate geometry.

## Web

```bash
npm run dev
```

Open **http://localhost:3000/web/** (serve root so `fonts/` and `src/` resolve). **Do not** open `web/index.html` as a `file://` URL (CORS).

```bash
npm run build-web
```

Deploy the **`docs/`** folder (GitHub Pages).

## License

MIT
