# Astrology engine library notes (celestine + astronomia)

Always-on rule for both: **read the real function signatures in `node_modules/<pkg>/dist/*.js` or `src/*.js` before first call — README examples and guesses cost failed runs.** These libs use inconsistent input units across functions; a wrong unit does NOT throw, it silently returns 1400s-era dates or NaN.

## celestine (MIT, zero-dep TS) — chart/houses/aspects engine

- `calculateChart(birth, options)` is **TWO arguments**: `birth` = {year,month,day,hour,minute,second,timezone,latitude,longitude} (local time + UTC offset, NOT a JS Date); house system and includeAsteroids/includeChiron/includeNodes/includeLots/includeLilith go in the **second** `options` arg. Putting `houseSystem` inside birth type-errors.
- `toJulianDate(dateLike)` also wants the object form {year,month,...,timezone}, not a `Date` — passing a Date yields NaN downstream.
- `greenwichMeanSiderealTime(jd)` → number(deg); `localSiderealTime(gmst, longitude)` — two-step, both plain numbers.
- House result shape is `{ system, systemName, angles, houses }` where the 12 cusps live at `result.houses` entries each `{house, longitude, signName, ...}` — `result.cusps` is NOT a flat number array; `.slice is not a function` was the symptom.
- `calculateAspects(bodies, config)` returns `{aspects, config, ...}` (NOT an array — `aspects.length undefined` was the symptom). Body field for motion MUST be named **`longitudeSpeed`**; passing `speed:` makes `isApplying` silently `null` (no error) and you lose applying/separating — verify applying is populated after any call-site refactor.
- `AspectType` is an exported enum (values are the lowercase strings) — pass enum members, bare strings type-error.
- Placidus `failed to converge ... using Porphyry` is a console.warn at |lat|≥~66.5°, and it DOES silently substitute the system — our wrapper must detect and surface it (honesty rule), not inherit the quiet swap.
- 7 systems: placidus, koch, equal, whole-sign, porphyry, regiomontanus, campanus. Equal/whole-sign share ASC/MC with others by construction; only middle cusps differ.
- **Library cross-chart aspect APIs are unusably narrow — never render them directly**: `calculateProgression(...).aspectsToNatal` gave 1 row for a ~28-year secondary progression (7 rows at 8° orbs) where the honest count is 27–46; `calculateTransits(...).transits` is the same class (13 rows where the honest count is 42). The shared fix — `selfCrossAspects(natal, outerPlanets, settings, sfx)` in dynamic.ts (powers transit / progression / solar-return / lunar-return): rename outer bodies `X·sfx` (`·P` progression, `·T` transit, `·R` returns), merge them WITH the natal bodies (incl. ASC/DSC/MC/IC pseudo-bodies) into a SINGLE `calculateAspects([...natalBodies, ...outerBodies], {aspectTypes, orbs, includeOutOfSign, outOfSignPenalty, minimumStrength})` call, keep only pairs where exactly one side carries the suffix, normalize the outer side into field `a` (display strips the suffix). Orbs then behave identically to the natal chart. `calculateProgression` positions themselves cover only the 7 classical bodies (no outers/nodes/lilith in `.planets`) — outer-planet rows will appear on the natal side only.
- Cross charts carry NO native applying / actual-angle data — `selfCrossAspects` must compute both: `actualAngle` (true 0–180° separation of the two bodies) and `applying` from relative speed (rate = sign(signed separation)·(s2−s1); deviation shrinking ⇒ applying). chart.ts natal aspects gained `actualAngle` the same way. Display contract built on this data: every aspect row = theory aspect + 实际度数 + 入/出相.
- `ProgressionType` in celestine covers `'secondary' | 'solar-arc' | 'minor' | 'tertiary'` — tertiary = day-for-month (1 day of motion = 1 lunar month 27.321582 d ⇒ ≈13.37 d/yr — celestine's own PROGRESSION_RATES.tertiary = 12 d/yr is WRONG vs the industry rate; castProgressionChart self-computes tertiary, never trust the library rate), minor = month-for-year. Grep `node_modules/celestine/dist/index.d.ts` for a feature BEFORE claiming it unsupported. There is NO lunar-return helper: self-scan the Moon to its natal longitude (0.5-day steps over a 35-day window → ~40-step bisection), then cast a full chart at the found moment — the same pattern as the solar-return Sun scan.

## astronomia (MIT) — B0 verification engine only

Per-function unit chaos (each failed call burned one run):
- `solar.apparentLongitude(T)` takes **Julian centuries** (jd−2451545)/36525.
- `moonposition.position(jde)` takes the **full JDE**.
- `solstice.march(year)` takes a plain year, returns **JDE** (TT) — convert to UTC with `jde − deltaT(year)/86400`; `deltat.deltaT` wants a **year**, not a JD (passing JD returns ~1.9e10 "seconds").
- Subpath exports are per-module (`astronomia/solar`, `astronomia/moonposition`, ...); `astronomia/sun` and `astronomia/data/elpMppDe` named imports throw ERR_PACKAGE_PATH_NOT_EXPORTED / missing export — enumerate `Object.keys(pkg)` in a one-liner first.

## Verification protocol (proven, reuse for any engine swap)

1. Absolute anchors with published values: 2024 equinox/solstice times (almanac, ±1 min), Meeus ex. 25.a Sun apparent longitude 1992-10-13 = 199.90696°, full-moon epoch via 180° elongation bisection.
2. Independent-implementation cross-check: cast the same public chart (Obama 1961-08-04 19:24 Honolulu UTC−10: Sun Leo 12.55°, Moon Gem 3.36°, ASC Aqr 18.05°, MC Sco 28.9°) with celestine AND the Python engine from `aryaminus/astro`; agreement <0.05° = pass.
3. Pass threshold: <5 arcmin (0.083°) — astro orbs are degree-scale, this is overkill-precise.

## three.js wheel/scene notes (ChartWheel.tsx C1 真实星体版, commit 03dd0c7)

- **Camera up-vector**: an XZ-plane chart viewed from +Y must keep the DEFAULT up (0,1,0) with lookAt(origin). Setting `camera.up.set(0,0,-1)` to "stabilize" the top view flips/tilts everything and fights the aim math — cost a full rewrite pass.
- **Focus (aim) math** for a disk spinning about world Y viewed from above: to bring ecliptic angle `a` (world polar, x=cos a, z=−sin a) to the camera-near side (screen bottom, world −Z after rotY), converge `rotY → −π/2 − a`, normalized to shortest arc `((diff + 3π) % 2π) − π`. Derive the constant ONCE from the projection formula and comment it; sign guessing burned several rounds.
- **Sprite dim/restore**: `material.opacity *= dim` every highlight pass compounds (select→deselect→select fades to 0). Snapshot a base value at creation into `material.userData.base`, then always write `opacity = base * dim`.
- **NaN poison**: one bad vertex in any BufferGeometry → computeBoundingSphere warns EVERY frame and the whole disk can vanish. Guard coordinate fns (`eclPos`) with Number.isFinite early-return; THREE has no `Quaternion.angle()` (use `angleTo(IDENTITY_Q)`).
- Renderer hygiene: dispose geometries/materials/textures in the effect cleanup (track array), remove canvas; rebuild scene only on [chart, view], NOT on selected (highlight via a module-level bridge `apiRef_local.set(n)` or ref).
- Raycast click vs drag: record pointerdown xy, ignore pointerup if moved >6-7px; HTML overlay buttons above the canvas need `if (!dragging) return` in onUp or canvas swallows their clicks.
- NASA textures: Solar System Scope `https://www.solarsystemscope.com/textures/download/2k_<body>.jpg` (public-domain-ish, free commercial). No pluto texture on that host — reuse moon grey. Ring texture needs radial-UV rewrite (RingGeometry uv is angular by default).

## Reference repos (clone to $LOCALAPPDATA/Temp, don't vendor)

- `aryaminus/astro` (MIT, pure-Python zero-dep engine + SKILL.md + references/*.md ruleset files): good for (a) cross-check engine, (b) the output-JSON schema style (planets carry sign/deg/house/retrograde/dignity), (c) ruleset-md structure for the future astro_rules work. NOT production-grade: whole-sign only, mean nodes, 1–2 arcmin.
- AGPL/GNU-affero-bound anything (pyswisseph wrappers, `@swisseph/*`, `swisseph-wasm`, openastrology-library): research-only, never a dependency of this private commercial site.
