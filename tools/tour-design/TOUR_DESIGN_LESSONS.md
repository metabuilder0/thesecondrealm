# Designing an Automated Wandering (autopilot tour) — lessons learned

Notes gathered while building `static/tours/spam_in_the_sky_2.json` ("Spam in the Sky").
They target agents that need to build a new tour quickly. Everything below was verified
against the code (`js/modules/3d/autopilot.js`, `autopilot-controller.js`, `world3d.js`,
`audioguide.js`, `points-cloud.js`) or measured with the simulator in `scripts/`.

## 1. Workflow that works

1. Decode the realm URL to get axes, scales and ranges (`scripts/decode.mjs`).
2. Load the data, convert every block to world coordinates, plot front / side / top views
   (`scripts/plot.py`) and look for distinctive structures.
3. Tie structures to events, and **verify every fact in the data** (block heights, dates, counts)
   before writing text. Dates: `static/data/series_blocks_time.csv`.
4. Write a rough circuit (`scripts/mk.py vX.py`), simulate it (`scripts/sim.mjs`),
   then let the optimizer tune it (`scripts/opt.mjs`).
5. Render the camera view at each stage (`scripts/render.py`, `scripts/ang.py`) and fix what
   the numbers miss (features seen end-on or edge-on, targets out of frame).
6. Write texts, generate the descriptor (`scripts/write_tour.py`), re-simulate the written file.
7. Build the realm URL (`scripts/encode.mjs`), update kiosk + atlas + CSS (see section 8).
8. Tell the user to generate audio with `tools/audioguide-generator`.

Budget: the geometry is what takes time. Do not hand-tune waypoints for long: the speed
reacts very non-linearly to curvature, use the optimizer early.

## 2. Descriptor format (autopilot)

```json
{
  "version": "0.2.0", "type": "autopilot", "title": "…", "lang": "en",
  "voice_level": "2", "music_level": "0.3", "coords_type": "data_series",
  "stages": [
    {"coords": [x, y, z], "title": "…", "desc": "…", "filters": [[["key", 1, 245000]]], "audiofile": "…"},
    …,
    {"coords": [x, y, z], "title": "Exit"}
  ]
}
```

- `coords_type: "data_series"`: coords are **raw data values** of the three axes
  (same units as the CSV series), converted by `pointsCloud.rawDataToCoords3d`.
  They may lie outside the data ranges (the ship can fly outside the cube).
- `desc` is shown as the stage content (`loadDescriptor` maps `desc` → `content`).
  Paragraphs separated by `\n\n`.
- `filters`: array of groups, OR between groups, AND inside a group.
  A constraint is `[axis, min, max]` with axis in `key` (block height), `x`, `y`, `z`, raw values.
  Applied **when the stage is reached**. A stage without `filters` shows everything again.
  Filters can isolate a handful of blocks precisely, e.g. F2Pool's megatransaction blocks:
  `[["key",364280,364800],["x",5500,7400],["z",1,3]]` → exactly 7 blocks.
- `audiofile` is added by `tools/audioguide-generator`; omit it when writing the tour.
- The last stage ("Exit", no `desc`) is **never reached**: it only shapes the end of the path
  (reaching it would crash on `stages[n]`). Put it ~100–120k world units after the last
  described stage.

## 3. Realm URL and world mapping

- URL: `index.html?r=<base58(JSON array)>`, array order from `SceneParams.serialize`:
  `[name, seriesX, seriesY, seriesZ, scaleX, scaleY, scaleZ, position, rotation, song, tour,
  timelapseMode, filterMinH, filterMaxH, filterMinX, filterMaxX, filterMinY, filterMaxY,
  filterMinZ, filterMaxZ, boundaries]`.
- `position` / `rotation` = world pose of the camera rig (`camera.moveTo`). Only `rotation[1]`
  (yaw) matters. Forward vector for yaw θ: `(-sin θ, 0, -cos θ)`.
  The tour starts from this pose, so set it to the start of your circuit.
- World coords: each axis is normalized to `[0, CUBE_SIZE=210000]` using the min/max of the
  data **after** the realm's range filters (and log10 if the scale is `log`).
  Compute those min/max from the CSVs (see `scripts/conv.mjs`). For Spam in the Sky:
  X 0..20894, Y 1..823785, Z 1..23642.
- CSV loading: line 1 is a header; row `h+1` (1-based line) is block height `h`;
  in a 0-based array, index `h-1` is height `h`.

## 4. How the autopilot actually moves (critical)

Measured by replaying the controller code frame by frame (`scripts/simlib.mjs`).

- Path = `[camera position, point 50,000 units ahead of the camera, stage1, stage2, …]`,
  centripetal Catmull-Rom. Nominal speed 3000 units/s, 6 s acceleration, 8 s deceleration.
- **The ship never stops at stages.** A stage triggers when the ship is within 1000 units
  of it; its text, audio and filters start then.
- **Curve slowdown:** speed factor `0.005 + 0.995 * (1/(1 + 3·a))^1.2`, where `a` is the angle
  between horizontal tangents sampled ±dt around the current position, expressed as a fraction of the path.
  At 60 fps this window is ~5% of the total path length. Consequences:
  - Turning is extremely expensive in time (≈1.3–2 s per degree of heading change on a ~1M path).
    A spiral around the cloud (330° of turning) lasted 13.6 min: avoid big loops.
  - Heading changes are the only brake. Use them **on purpose**: small turns toward each
    target slow the ship to 400–1500 units/s near stages, which gives time for narration.
  - **The window depends on the frame time** → durations change with the display rate.
    Simulate at 60 fps (30 fps gives very different stage intervals).
- **Yaw follows the horizontal tangent only** (no pitch), rate-limited (π/96 per frame),
  computed relative to the current dolly orientation. On a near-vertical path, tiny horizontal
  moves produce large heading changes: keep a horizontal component everywhere.
- **End of tour:** when less than 10 s of effective travel remain, the ship decelerates and
  the goodbye message **replaces the current stage text** and starts the outro audio.
  The last described stage needs ≥ 30 s before that moment.
- The generic intro audio (`/static/sounds/wandering_intro_<lang>.wav`) plays before the
  ship moves. The first stage should trigger ~25–35 s after departure.
- **Audio overlap:** `AudioGuide.loadAudio` calls three.js `Audio.play()`, which is ignored
  while a clip is still playing. If the next stage arrives before the narration ends,
  **its audio is silently skipped**. Stage spacing must exceed narration length.

## 5. Design rules of thumb

| Reference tour | Length (world units) | Duration | Max yaw rate |
|---|---|---|---|
| Patoshi's Box | 823k | 5.1 min | 0.6°/s |
| Satoshi's Tree | 370k | 6.4 min | 8.9°/s |
| Bitcoin Tsunami (autopilot, filters) | 919k | 20 min | 4.5°/s |
| Spam in the Sky v2 | 478k | 6.2 min | 3.1°/s |

- Target 5–7 min, ≤ 10 stages, 30–45 s between stages, 55–69 words per text
  (≈ 25–28 s of TTS). Keep max yaw rate under ~3–4°/s for comfort.
- Total path ~450–550k with gentle purposeful turns is a good starting point.
- When the vertical axis is time (block height), **climbing through history** is natural:
  mostly vertical ascent from a vantage point outside the cloud, facing it, each stage at the
  altitude of its event.
- Camera FOV: vertical 95° (±47.5°), horizontal ≈ ±62° at 16:9. Keep main targets within
  ±40° of the heading at trigger time **and still 10–15 s later**, distance ≲ 140k
  (overviews can go to ~250k).
- Look at linear features **from the side**: a line pointing away from the camera collapses
  into a dot (the 2011 dust trail was invisible seen end-on).
- When a filter isolates a thin layer (a few weeks of blocks), fly **10–25k above it**;
  at the same altitude it is seen edge-on as a flat line. From above, structures such as the
  1 MB block-size "wall" appear clearly.
- Points render as ~1 px stars: isolated clusters of 7–20 blocks are visible (Tsunami's
  "Morning Star"), especially when a filter hides everything else. Tell the viewer where to look
  ("to the right of the column", "below, slightly to the left").
- Flying through the dense cloud is acceptable and looks good, but describe what surrounds you.

## 6. Tooling (`scripts/`)

All scripts are realm-specific in places (axis names, data ranges, targets); adapt the
constants at the top of each file. Python needs numpy + matplotlib:
`python3 -m venv /tmp/venv && /tmp/venv/bin/pip install numpy matplotlib`, run with
`MPLCONFIGDIR=/tmp/mpl /tmp/venv/bin/python …`. Intermediate files go to `/tmp`.

| Script | Role |
|---|---|
| `decode.mjs` | Decode every realm URL of `static/kiosks/default.json`. |
| `encode.mjs` | Decode a realm URL, change pose/tour, re-encode (edit the source string and fields). |
| `load.mjs` | Load a CSV series as an array. |
| `plot.py` | Compute world coords (`/tmp/X.npy`, `Y.npy`, `Z.npy`) and plot front/side/top views. Edit series names and ranges. |
| `mk.py` | Helpers `w2d` (world → data coords), `hb(height)` (height → world y), `build(name, cam, stages)`; `python3 mk.py vX.py` writes `/tmp/vX.json`. |
| `sim.mjs` | Faithful replay of the autopilot: `node sim.mjs cfg.json` → duration, stage trigger times/headings, yaw-rate histogram, `/tmp/simlog.json`. |
| `simlib.mjs` | Same simulator as a function (used by the optimizer). |
| `opt.mjs` | Hill-climbing optimizer: `node opt.mjs in.json 800 out.json`. Scores stage intervals, max yaw rate, total duration and target visibility. Edit `T` (targets per stage), `MINI` (min interval per stage), `YFREE` (allowed altitude ranges). ~0.15 s per evaluation. |
| `render.py` | Renders the camera view at stage triggers: `render.py cfg.json /tmp/plots/prefix 0,15` (needs `/tmp/simlog.json` from `sim.mjs`). |
| `ang.py` | Angles/distances of given blocks from the camera at given times: `ang.py 67:143875,143880 81:143870`. |
| `conv.mjs` | Convert an existing tour to world coords to simulate it (baseline). |
| `write_tour.py` | Example: circuit + texts → descriptor JSON (data coords). |
| `example_spam_in_the_sky_circuit.json` | Final Spam in the Sky circuit (world coords, simulator format). |

Simulator config format: `{"camera": {"pos": [x,y,z], "yaw": θ}, "stages": [{"title", "w": [x,y,z] world, "filters"}]}`.

## 7. Pitfalls met along the way

- A simulator that freezes the dolly orientation gives wrong yaw rates (1.9 vs 5.5°/s):
  the controller computes tangents in the **current** dolly frame.
- Optimizing at 30 fps then checking at 60 fps: completely different intervals.
- The optimizer only checks numbers; always render the views (end-on trail, edge-on layer
  were found visually).
- The Cursor browser in this VM has **no WebGL**: the 3D realm cannot be tested there.
  The page shell and the atlas can. A local `python3 -m http.server` started inside the
  sandbox is unreachable from the browser; run it outside the sandbox.
- `static/tours/`, `static/kiosks/` and `static/data/` are gitignored
  (`static/kiosks/default.json` is tracked anyway). A new tour file needs `git add -f`.

## 8. Integration checklist

- `static/tours/<name>.json` (keep older drafts untouched).
- Realm URL with the new `tour` path and a start pose matching the circuit.
- `static/kiosks/default.json`: GUIDED TOURS entry (`url`, `desc` ending with
  "An Automated Wandering with filters." when filters are used).
- `pages/atlas/atlas.html`: card `NAME (AUTO)` in the last row before "SHARE YOUR REALM",
  with a `visual` id; `css/thesecondrealm.css`: add that id to the rule holding the realm thumbnail.
- Audio: run `tools/audioguide-generator` on the tour (adds `audiofile`, `lang`, levels).
- In the summary, give duration, stage intervals and max yaw rate, and mention data limits
  (e.g. data ending at block 823,785, Jan 1, 2024).
