# Stencil / form generator — analysis and implementation plan

This document summarizes what the project does today, the target behavior, and a concrete plan to rename and refactor toward **stencil-form-generator** (working name; npm package: `stencil-form-generator`).

---

## 1. Current state (analysis)

### 1.1 Identity and packaging

| Item | Current |
|------|---------|
| Package name | `font-to-stl` (`package.json`) |
| Role | Turn TTF/OTF text into 3D STL (JSCAD + opentype.js) |

### 1.2 Core geometry model (important)

The implementation is **additive**, not subtractive:

- **`generate()`** (`src/core/textPlate.js`): Builds a rectangular **plate** (cuboid) and **union**s **raised** letter solids extruded upward from the top face of the plate (`translate(..., z: thickness)`).
- **`generateFontToSTL()`**: Extrudes each glyph’s 2D contours to a **solid letter** (`extrudeLetterContours` → `letterHeight` along Z). With `addPlate`, it places a plate under the text and **union**s `plate + text translated above the plate**.

So “letters” are **positive volumes** sitting on (or above) the plate. There is **no** boolean **subtract** from stock today.

### 1.3 Parameters (today)

- **`letterHeight`**: Extrusion height of letter solids (mm) — effectively “how tall the positive letters are,” not “how deep we cut into the plate.”
- **`characterHeight`**: Typographic size of glyphs in the XY plane (mm).
- **`addPlate` / `plateThickness` / `platePadding`**: Optional base plate dimensions and margin around text.

### 1.4 Surfaces

- **CLI**: `src/cli/index.js` — JSON input, `generate` / `generateFontToSTL`, batch font sets.
- **Web**: `web/` + `build_web.js` → copies into `docs/`; `web/main.js` loads `fonts/manifest.json` (large font list) and calls `textPlate.web.js` (mirrors core).
- **Examples**: `examples/*.json` document parameters.

### 1.5 Fonts on the web

- `web/fonts/manifest.json` lists many Google-style fonts for the dropdown.
- Stencil mode will require a **reduced, curated list** (see §3).

---

## 2. Target product behavior

### 2.1 Mental model

We stop modeling “extruded letters on a plate” as the default product. Instead we model **stock plate** + **toolpath volume** that removes material:

- **Stencil mode**: Cut the text **through the full thickness** of the plate (open holes through the stock). Suitable for spray stencils, etc.
- **Form mode** (pocket / relief): Cut **only X mm** into the plate from one face — a **blind pocket** or engraved text, not a through hole.

### 2.2 Parameters (proposed)

| Parameter | Stencil | Form |
|-----------|---------|------|
| `plateThickness` | Total stock thickness; **cut depth = full plate** | Total stock thickness |
| New: `cutDepth` or `pocketDepth` | Ignored or forced equal to `plateThickness` | **X mm** — depth of cut into plate (must be `0 < pocketDepth ≤ plateThickness`) |
| `characterHeight`, `spacing`, `lineSpacing`, `resolution` | Unchanged | Unchanged |
| `letterHeight` | **Removed** — use `pocketDepth` (form) or full plate thickness (stencil). Old JSON that used `letterHeight` must be updated manually. |

**Coordinate convention:** Keep the existing plate placement (plate spanning Z from `0` to `plateThickness` with current transforms). The **cutter** should be the same 2D glyph profile extruded along **−Z** from the **top** face (`z = plateThickness`) for a depth of `cutDepth`, then **`subtract(plate, cutter)`** (JSCAD `booleans.subtract`).

### 2.3 Layout modes

- **`combined`**: One plate spanning the laid-out text block; one subtract operation (or union of cutters then one subtract).
- **`separate`**: Per-letter plates (each small plate with through or pocket cut) — same subtract pattern per letter.

There is **no** retained “raised text” / additive extrude-on-plate mode — the product is **only** cut-from-plate (stencil or form).

---

## 3. Stencil-only fonts (web + validation)

### 3.1 Goal

In **stencil** mode, only offer fonts that work well as stencils (no enclosed counters that fall out, or we document exceptions). Practically:

1. **Curated allowlist** in `web/fonts/manifest.json` (e.g. `stencil: true` on entries) **or** a separate `web/fonts/manifest-stencil.json` merged at build time. **Font choices:** use only faces listed in **§3.2** (or subsets thereof) so licensing stays clear.
2. Web UI: when mode = stencil, populate the font `<select>` from that list only; optionally show a short note (“Stencil-safe fonts: …”).
3. CLI: if we add a `--stencil` flag or JSON `productMode: "stencil"`, reject `fontName` not in the allowlist with a clear error **or** warn and proceed (policy choice; strict is safer for predictable physical results).

### 3.2 Free-to-use fonts for the stencil allowlist

Stencil mode should only offer faces we are **allowed to redistribute** with the app (self-hosted TTF/OTF in `fonts/` + entries in the manifest). Prefer **SIL Open Font License 1.1 (OFL)** — same family as the rest of Google Fonts: free for commercial and personal use, with minimal conditions (no selling the font file alone; keep license/copyright with the font).

#### A) Google Fonts — OFL 1.1 (recommended default set)

Ship these from [Google Fonts](https://fonts.google.com/) (download the static TTF or variable TTF; keep `OFL.txt` / `AUTHORS` with the files in `fonts/` or a `fonts/licenses/` folder per upstream layout).

| Font | Styles (typical) | Notes |
|------|------------------|--------|
| [Stardos Stencil](https://fonts.google.com/specimen/Stardos+Stencil) | Regular 400, Bold 700 | Classic stencil; strong default. |
| [Allerta Stencil](https://fonts.google.com/specimen/Allerta+Stencil) | Regular 400 | Military / industrial stencil. |
| [Saira Stencil One](https://fonts.google.com/specimen/Saira+Stencil+One) | One weight | Geometric stencil display. |
| [Big Shoulders Stencil Text](https://fonts.google.com/specimen/Big+Shoulders+Stencil+Text) | Variable | Stencil text style; check glyph bridges for physical cut. |
| [Big Shoulders Stencil Display](https://fonts.google.com/specimen/Big+Shoulders+Stencil+Display) | Variable | Display stencil; same caveat as above. |
| [Black Ops One](https://fonts.google.com/specimen/Black+Ops+One) | Regular 400 | Stencil-*like* military display; some glyphs may still produce **islands** (e.g. “O”) — tag as “advanced” or omit if you want the strictest physical-stencil set. |

**Implementation note:** Variable fonts already appear in this repo (e.g. `*-Variable.ttf`). If tooling struggles with a given variable file, add a **static** instance from Google’s download bundle instead.

#### B) Other open fonts (OFL) — optional add-on

| Font | Source | License |
|------|--------|---------|
| [Keys Stencil](https://github.com/jordanstephensen/keys-stencil) | GitHub releases / repo | SIL OFL 1.1 (confirm in repo before bundle). |

#### C) Free desktop fonts — only if license is verified

| Font | Source | Note |
|------|--------|------|
| [Octin Spraypaint Free](https://www.fontsquirrel.com/fonts/Octin-Spraypaint-Free) | Font Squirrel / Typodermic | Often offered as a **free** style; **read Typodermic’s license** for embedding and redistribution before adding to `fonts/`. Do **not** add to the default allowlist until the license file is in the repo. |

**Exclusions:** Aggregators (DaFont, random “free font” sites) often mean **personal use only** or no redistribution — **do not** bundle those unless the license explicitly allows app redistribution.

### 3.3 Physical note

True stencil typography often uses **bridge tabs** in letters like O, A, B. Our geometry only follows the font outline; **disconnected islands** (the center of “O”) will still drop out unless the font includes stencil-specific glyphs or we add bridge generation (future enhancement). The plan should **document** this limitation in README.

---

## 4. Rename and repo hygiene

| Area | Action |
|------|--------|
| `package.json` | `name`: `stencil-form-generator`, update `description` |
| `README.md` | Retitle; describe stencil vs form; new parameters; rename scripts if any reference old name |
| CLI help strings | “Stencil / form generator” |
| `web/index.html` | Page title and headings |
| User-facing strings | “Cut from plate,” not “extruded letters” where applicable |

Folder rename on disk (`stencil-generator` → `stencil-form-generator`) is optional and can be done by the user when they move the repo; the **npm name** is what matters for publishing.

---

## 5. Implementation phases

### Phase A — Core geometry (`textPlate.js` / `textPlate.web.js`)

1. Add **`booleans.subtract`** import from `@jscad/modeling`.
2. Implement **`buildLetterCutVolume(contours, cutDepth)`** (or reuse `extrudeLetterContours` with depth = `cutDepth` and consistent Z placement): same triangulation as today, extrusion along Z over `[0, cutDepth]`, then translate so the volume occupies **`[plateThickness - cutDepth, plateThickness]`** in plate Z (cut from top face).
3. New **`productMode`** (or `geometryMode`): `"stencil"` | `"form"`.
   - Stencil: `cutDepth = plateThickness` (require `addPlate` / plate present).
   - Form: `cutDepth = pocketDepth` (validate vs `plateThickness`).
4. Replace **`union(plate, raisedText)`** with **`subtract(plate, cutterUnion)`** for `generateFontToSTL` (and align `generate()` with the same subtractive model if it stays in scope).
5. Mirror changes in **`textPlate.web.js`** (keep in sync; build script copies to `docs/`).

### Phase B — CLI and examples

1. Extend JSON schema: `productMode`, `pocketDepth`, keep `plateThickness` required for cut modes.
2. Update **`examples/`** with `example-stencil.json`, `example-form.json`.
3. Add **§3.2A** Google Fonts stencil files to **`fonts/`** (static or variable TTF as supported) and ship each family’s **OFL** / copyright file alongside upstream expects; set **`stencil: true`** (or equivalent) on those manifest entries. Optional: **§3.2B** Keys Stencil after confirming OFL in repo; **§3.2C** only after explicit license review.
4. Adjust **`generate-base-set` / `generate-full-set`** only if they still make sense for stencil products (may need flags or separate output dirs).

### Phase C — Web UI

1. Toggle: **Stencil** vs **Form**.
2. Form: numeric input for pocket depth (mm).
3. Stencil: font dropdown = **stencil subset** of manifest (faces from **§3.2** only); Form: can keep full list or same — **product decision** (plan: form = all fonts, stencil = subset).
4. Labels: “Plate thickness,” “Cut depth (form only),” etc.

### Phase D — Docs and tests

1. README + short “limitations” (O, A, islands).
2. Manual test: export STL and verify in a mesh viewer that holes go through (stencil) or stop mid-plate (form).

---

## 6. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Boolean subtract** performance / robustness on complex meshes | Keep resolutions sane; test with a few fonts; JSCAD subtract can be slow — acceptable for typical text sizes |
| **Numerical gaps** (manifold errors) | Slight overlap of cutter into plate bottom or use epsilon; test `subtract` |
| **User expects old additive STL** | Document breaking change and new parameters (`pocketDepth`, `productMode`); no compatibility mode |

---

## 7. Summary

The codebase is a capable **font → mesh** pipeline with **union-based** “letters on plate.” The product shift is **subtractive** only: one **plate** minus **extruded glyph volumes** to a controlled **depth** (full for stencil, partial for form), plus a **stencil-only font list** on the web. There is **no** parallel additive/“raised text” export path. Implementation centers on **`subtract`**, Z placement of cutters, new **mode/depth** parameters, rename to **stencil-form-generator**, and updated UI/CLI/docs.

After this plan is approved, implementation follows **Phase A → B → C → D** in order.
