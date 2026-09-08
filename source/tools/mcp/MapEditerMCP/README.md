# Wulfram Forge MCP

A local MCP server for the Wulfram Forge Windows desktop editor. The server package includes its map serialization modules, dependency lockfile, and native test fixtures. It can start from its own checkout, including the nested `tools/mcp/MapEditerMCP` layout.

Requirements: Node.js 22.13 or newer, npm, and a compatible MCP-enabled Wulfram Forge Windows editor for live map operations. Building the editor also requires the .NET 9 SDK and WebView2 runtime.

## Install and verify

Run from this repository's root:

```powershell
npm ci
npm test
npm start
```

`npm start` runs the STDIO server and waits for an MCP client. Configure your client's command as the absolute path to Node, with arguments `--experimental-strip-types` and the absolute path to this repository's `server.mjs`. Both `server.mjs` and `MCPserver.mjs` are required; preserve capitalization.

`npm test` verifies the MCP handshake and ten tool definitions without connecting to an editor, compares all eight ZIP entries against the native fixture, and runs six isolated Windows pipe regressions for concurrency, deadlines, startup gaps, disconnects, rejection recovery, and malformed responses. The pipe regressions require Windows PowerShell and skip on other platforms. These checks do not establish live editing or gameplay behavior.

## Editor integration

The server is self-contained; the native editor is a separate application. Keep the editor's `McpEditorHost.cs`, `MainForm.cs`, `lib/mcp-commands.ts`, `lib/use-mcp-bridge.ts`, and editor UI integration together in a compatible editor checkout.

For the build, launcher, and native acceptance scripts, set the editor location when it is not an ancestor of this package:

```powershell
$env:WULFRAM_FORGE_ROOT = 'C:\path\to\wulfram-mapeditor'
```

When this repository is under `tools/mcp/MapEditerMCP`, the scripts find the ancestor editor automatically. An explicitly supplied invalid path fails with an actionable error.

Install the editor's npm dependencies in its checkout first. Then run these scripts from this repository, checking each succeeds before continuing:

```powershell
.\build-editor.ps1
.\launch-editor.ps1
npm run test:desktop
```

The builder uses the editor's local `.dotnet-sdk/dotnet.exe` when present, otherwise `dotnet` on PATH. It creates `dist/desktop/mcp-v0.1.0/WulframForge.exe` in the editor checkout. The launcher enables the native bridge using a separate persistent profile. Native acceptance uses an isolated profile and the two files in `fixtures/three-lane-citadel/`.

## Tools and operation

The server exposes `list_editor_sessions`, `get_editor_state`, `inspect_map`, `inspect_routes`, `validate_map`, `edit_entities`, `edit_terrain`, `edit_terrain_protection`, `apply_landform`, `apply_lane`, `capture_view`, `undo`, `save_copy`, and `export_map`.

`apply_landform` requires desktop v70 or newer, an explicit `placementMode` (`protected` or `manual`), current revision and `stamp` settings. Required settings are preset, x/y, radius, aspect, rotation, amplitude, edgePower and mirror. Optional independent length/width, seed, naturalness, roughness, bend, blend, textureName, textureCoverage and `shapeVersion: "natural-v2"` match the editor. Presets are ridge, valley, crater, saddle, mesa and basin. Coordinates/heights are world units; rotation is degrees. Protected mode requires authored route data. Manual mode skips that route mask but still preserves structure reserves and saved height rules. Applying invalidates cached analysis, rejects new editor validation errors, and records one Undo step. Mesa and basin add a constant offset in the center; they do not flatten uneven existing terrain. Older editors reject saved libraries containing these new shapes. Use preview placement in the GUI for visual review; the MCP operation commits the stamp directly.

`edit_terrain_protection` requires the rebuilt private desktop v67 or newer. Inspect first, then supply `sessionId`, `expectedRevision`, `activeLayoutId`, and `edit`: either `{ "operation": "add", "name": "Protected ridge", "x": 1000, "y": 1000, "width": 500, "height": 300 }` or `{ "operation": "remove", "id": "ID from inspection" }`. Coordinates are world units. The tool changes one height rule in the active layout and creates one Undo step; it preserves other rules, buildings, and terrain. Protection covers shared terrain across layouts, while texture painting remains available. `inspect_map.terrainProtection` lists rules grouped by layout, so a rule in another layout remains visible. It does not implicitly use the GUI brush selection. Older hosts reject this new command; updating the Node server alone does not add desktop support.

Discover and select the intended session, inspect its map, then use its current revision for edits. Entity IDs are map-specific. Successful edit batches use the editor's undo history; invalid or stale requests reject. After a timeout or disconnect, inspect again before retrying a write.

Calls to the same session are serialized. The request budget includes queue waiting, and an absolute deadline travels with the command to the native host and renderer. Rebuild the compatible editor after updating `McpEditorHost.cs` to obtain this deadline protection; older binaries do not enforce the new envelope field. Only connection failures before submission are retried automatically. A command that already started before its deadline can still complete after a disconnect, so re-inspection remains necessary.

Native acceptance also checks concurrent reads, delayed renderer recovery, and short client deadlines. It records the executable SHA-256 in its report. Run the build first so the result covers current source.

The server uses STDIO and a current-user Windows named pipe. The editor bridge must be explicitly enabled. Session credentials are local and are not returned by discovery. Exports are new files under this package's `outputs/mcp-exports/`; existing files are never overwritten. Exporting a copy does not mark the editor saved.

## Included files and exclusions

`lib/` contains the shared serialization source required for ZIP exports; see its README for provenance and update guidance. `fixtures/` contains the JSON project and matching ZIP required by native acceptance. `tests/` contains standalone package checks.

Dependencies, generated builds, exports, session descriptors, profiles, and credentials remain excluded from Git. Run `npm ci` after cloning. Do not add session credentials to this repository.

## Troubleshooting

- Startup import error: restore the complete repository, including `lib/`, and run `npm ci`.
- No editor sessions: launch a compatible MCP-enabled editor and open a map.
- Missing editor checkout: set `WULFRAM_FORGE_ROOT` to its directory.
- Missing native executable: run the editor build script after installing its dependencies and .NET SDK.
- Stale revision or uncertain write outcome: inspect the current map before retrying.

This is a Windows desktop integration; starting the server does not launch the editor. Included source and game fixtures retain their existing rights; inclusion does not grant additional redistribution permission.

`apply_lane` requires desktop v71 or newer and the current revision. Supply `lane` with 2-32 world-coordinate `points`, `width` (80-2000), `shoulder` (40-2000 per side), `floorHeight` (-5000-5000), `operation` (`cut` or `cut-fill`), `mirror` and `placementMode` (`manual` or `protected`). The shared editor operation blends rounded shoulders, preserves structures and saved height rules, invalidates cached analysis and creates one Undo step. Cut mode leaves ground below the floor unchanged. Protected mode additionally requires authored route data. MCP commits directly; use the GUI Lane tool for a visual preview. Width must also span at least two terrain grid steps, and the full lane footprint must fit inside the map.

`inspect_routes` (desktop v72+) reads the committed active map using explicit `vehicleWidth` (20-400 world units). It returns automatic service routes and authored corridors, ordered points, lengths, saved widths, width-exceeds-reservation flags and sampled clearance markers. It includes all teams at authored endpoints; automatic routes treat the destination pad as drive-on. This read leaves map, revision, Undo and camera unchanged. GUI candidate previews are inspected through the candidate inspector, not this committed-map MCP read. Geometry and clearance do not certify gameplay.


Entrance routing (desktop v73+): `inspect_entrances` returns the active layout ID, current policy (or null), and available corridor IDs with ordered points. `set_entrance_routing` requires sessionId, expectedRevision, activeLayoutId and policy. Supply `{version:1,bindings:[{team:1,corridorId:"...",direction:"forward"}]}` (at most one binding per team), or null to restore automatic approaches. Direction is battlefield-to-base; reverse traverses the saved points backward. Explicit bindings are checked against current terrain/buildings before one Undo step. `inspect_routes` then returns bound service routes with entranceCorridorId. Later edits can invalidate access; inspect again. This is not game collision proof.

Offset favorites with entrance policies export as library version 4 (reservation schema 3). Older libraries remain readable; older editors reject version 4. Policies for other corridor families currently require whole-map preservation instead of favorite capture.

The optional Wulfram Forge Launcher selects a local editor EXE and starts it with its existing environment. It does not change MCP commands or automatically update/register the server. After changing editor builds, use fresh session discovery; old session IDs do not transfer between processes.


### Creative base layouts — desktop v74+

`generate_base_layout` uses the editor's creative generator. Supply `sessionId`, current `expectedRevision`, explicit `previewOnly`, and `request` containing `activeLayoutId`, a **new** `layoutId`, `style`, `seed` and `placement`. Placement requires `size` (small/standard/large/massive), world-unit `x`, `y`, `radius`, and degree `rotation`; optional controls are `targetCount` (0 automatic or 6–120), `checkAccess`, `terrainAware`, `entranceDegrees`, and Offset-only `offsetArrangement` (classic/wide-front/deep-court/split-wings).

Preview with `previewOnly:true` returns the candidate layout without editing or changing history. Apply with `false`, the same settings and a current revision adds and activates a new layout in one Undo step. Existing layouts remain stored; their buildings are not merged into the new layout. Duplicate IDs and stale revisions reject. The generator checks fit/power; requested access checks are sampled editor evidence, not driving or combat proof. This command requires the rebuilt v74 host and updated server package together.

## Authored base capture and placement (v82+)

The rebuilt v82 host and updated server expose capture_authored_base and place_authored_base. Capture requires sessionId, expectedRevision, activeLayoutId and sourceFrame {origin:[x,y,z],yaw}; it returns packageJson without editing. Placement requires the same session/revision, packageJson, explicit previewOnly and authoredRequest {activeLayoutId,layoutId,frame,terrainMode}. Use a new layoutId, yaw in radians, and terrainMode preserve or conform. Preview does not change history; apply adds a new layout with one Undo step. Existing layouts remain intact. Rectangular rules require 90-degree delta rotations; starships retain source altitude/rotation. Editor support checks are not game collision proof. Requires the rebuilt host, not only this Node package.


### Saved authored library (desktop v86)

`inspect_authored_library` returns the versioned library and exact raw storage value. Supply the current editor revision to all library tools. `edit_authored_library` also requires `expectedLibraryRaw` (null for absent storage) and `libraryEditJson`: save `{operation:"save",entry:{id,name,base}}`, rename `{operation:"rename",id,name}`, remove `{operation:"remove",id}`, or restore `{operation:"restore",entries}`. The returned `before.entries` can be restored using the returned `raw` as the next expected value. This changes library storage only, never map Undo. Save rejects duplicate IDs/names. Reload after errors; never automatically replay an uncertain write.

`recover_authored_library` takes the inspected damaged raw value, backs up exact bytes and resets to a validated empty envelope. Healthy libraries reject recovery. GUI controls use the same storage code. Libraries belong to the current editor profile; load/export an authored JSON file to transfer an entry to another device. Native transport size limits still apply to large library responses.

### Whole authored-library portability (desktop v87)

GUI: Saved authored bases > Export authored library writes the complete versioned collection. Import authored library shows new/skipped counts; Apply merges, Cancel leaves storage unchanged, and library Undo restores the prior collection. Same-ID identical content is skipped even if JSON key order differs. Changed content under the same ID and case-insensitive name conflicts reject the whole merge. Resolve conflicts at the source; saving as a new copy gives a new ID. Limits remain 50 entries and 2 MB.

MCP: `edit_authored_library` accepts `libraryEditJson` with `{operation:"import",library:<exported envelope>}`. Set `previewOnly:true` to validate without writing. The server dispatches a separate `preview_authored_library` native action, so v86 rejects preview rather than ignoring a new flag and committing. Use the original exact raw storage value to apply; preview does not reserve or lock storage. `inspect_authored_library.library` is the exportable envelope. Library operations remain separate from map Undo.


### Service Courtyard review candidate (private v89)

The rebuilt private v89 host accepts `style: "service-courtyard"` through `generate_base_layout`. Automatic per-team counts are 10/15/21/33 for small/standard/large/massive. Target fitting preserves required roles; infeasible budgets reject. Placement retains six court/mouth reservations, paired terrain support, and sampled 80-unit through-route checks even when optional `checkAccess` is false. Preview and Apply use the same shared generator. Older hosts do not gain this capability from a server-file update.

This is an MCP-accessible review candidate, not an admitted visual-library card. Native generation and JSON round-trip evidence do not establish GUI catalog, portable-library, original-model visual or game collision acceptance. Keep the current session and revision guards; inspect preview before Apply.

Courtyard favorite portability is newer source work than private v89: reservation schema 4 requires base-library envelope 5 and recomputes destination passage clearance. It requires a later rebuilt host; v89 native generation evidence does not prove portable favorite support.

Private v91 promotes Service Courtyard into Creative after the editor-family admission review. Native GUI/MCP generation, portable favorite reuse and four-size ZIP reopening pass. Recipe and reservation schemas are unchanged from v90.1; gameplay remains unverified.


### Experimental Broken Ring

`generate_base_layout` accepts `style: "broken-ring"` with the existing placement schema in private desktop v92 or newer. All four sizes preserve ten paired reservations and a versioned plan; use a radius of3000 for an initial preview. Map size, terrain, power, paired support and final site associations can still reject a placement. Preview before applying with a fresh revision. Sampled routes do not establish pad-entry or gameplay collision.

The v93 candidate adds portable favorites using reservation version5 and library envelope6; earlier desktop builds cannot read that format. Native v93 portability acceptance is tracked in the editor's `docs/BROKEN_RING_DESIGN.md`. Edited reserved geometry still requires a whole-map save. No new MCP tool is required: the command delegates to the shared editor generator, while existing library controls handle favorite storage.

The next private candidate generates Broken Ring recipe v2: seed-dependent horizontal/vertical stretch, shoulder spans and shifted openings. Use a 3300-unit placement radius for the largest candidates. Reservation version5/library envelope6 now dispatch explicitly by recipe version: existing v1 favorites keep their geometry, unknown versions reject, and v93 cannot read v2 favorites. This is shared generator/validation behavior through the existing MCP command; native v2 acceptance is tracked separately in `BROKEN_RING_DESIGN.md`.

The v95 source candidate generates recipe v3 with a96u service-pad center margin beyond neighboring model-bound edges. Final shared placement and favorite reuse require the wider sampled automatic approaches even when optional access checks are off. V1/v2 favorites retain their recipes; v94 cannot read v3. Plan validation tolerates only1e-9u numeric reconstruction roundoff between runtimes and preserves stored coordinates. Native v95 proof is tracked separately; no new MCP command is required.

The v96 presentation candidate promotes Broken Ring to Creative as one reviewed family. The generator command/style and recipev3 remain unchanged. See `docs/BROKEN_RING_GUIDE.md` for sizes, budgets, placement and version compatibility; rebuilt GUI handoff verification is required before the promotion is complete.

## Valley Pockets and portable formation favorites

Private desktop v99 supports Valley Pockets generation, exact counts and portable favorite capture/reuse. The v96 installer does not include Valley Pockets. V97.1 supports default counts only; v98 adds expanded counts but lacks favorite commands.

`generate_base_layout` accepts `style: "valley-pockets"`. It adds powered side yards while retaining current buildings and saved constraints in a new layout. Set targetCount to 0 for the size minimum (10/15/20/30) or an exact higher number of newly added structures per team, up to 120. Additional defenses must fit the existing yards; infeasible requests reject without mutation. Custom entrance directions and Offset arrangements are unsupported.

`capture_formation_favorite` requires sessionId, expectedRevision, activeLayoutId and favoriteId. It returns packageJson containing a versioned portable library; it is read-only and does not edit personal storage. Valley capture verifies original generated buildings and passage reservations; edits that cannot be represented require a whole-map save.

`place_formation_favorite` requires sessionId, expectedRevision, packageJson, favoriteRequestJson and explicit previewOnly. The request JSON contains activeLayoutId, a fresh layoutId, favoriteId and placement {size,x,y,rotation,radius}, with optional checkAccess, terrainAware and targetCount. Valley favorites retain their saved count and yard arrangement. Reuse checks destination terrain, power, buildings and constraints. Preview returns the candidate without mutation; Apply activates a new layout in one Undo step. GUI library management handles personal storage and version-7 import/export.

V99 native evidence covers capture/reuse, GUI library export/import, restart, larger-map transformed coordinates, retained buildings and Undo. Additional same-map size/terrain cases pass. These are editor checks, not vehicle collision or gameplay proof. Valley Pockets remains Experimental pending family admission review.


### Multiple entrances — source integration for v101

`set_entrance_routing` accepts legacy version 1 or `{version:2,sockets:[{id,name,team,mouthCorridorId,mouthDirection,approach?:{corridorId,direction}}]}`. Up to three sockets per team; IDs and same-team corridor roles must be distinct. Mouths point from lane-facing endpoint to court; an approach must end at that first mouth point. Omitted approaches remain unbound. Inspection labels automatic connectors separately.

`previewOnly:true` uses the dedicated native `preview_entrance_routing` action so older hosts reject it instead of accidentally committing a preview. Omit or set false to Apply one Undo step. Revision checks remain mandatory. Version-2 authored-base packages preserve these policies and transformed reservations; old fixed formation-favorite envelopes cannot represent them and must use authored-base export instead. The v100 accepted executable does not contain this source integration; rebuilt v101 native acceptance is pending.

### Three-Lane Anchor (v103 source integration)
The existing generate_base_layout tool accepts style three-lane-anchor on hosts containing this feature. It preserves existing buildings in a new layout and creates six explicitly unbound exits. Counts are 0 (size default) or 15/21/30/42 for small/standard/large/massive. Placement radius contains full models and reservations. Access checks are mandatory; yard positions are fixed and terrain is validated, not adapted. Existing entrance policies reject to preserve their bindings. Use authored-base or whole-map export for reuse; formation favorites cannot retain these rules. Native v103 acceptance is pending.


Three-Lane Anchor count extension (v105 source): 0 selects the size minimum (15/21/30/42). Integer targets from that minimum through120 add defenses across the existing three powered yards. Impossible fits reject without mutation; model scale and court geometry stay fixed. Default counts retain recipe v1; expanded counts use v2. Native v105 expanded-count, authored-library reuse and explicit file-reopening verification passed. V106 promotes the card to Creative; rebuilt catalog and authored-library lifecycle verification passed. Geometry and existing MCP operations are unchanged.



### Curved lanes (v107 source)
`apply_lane` now accepts optional `lane.bend` from -1 to 1 with exactly two endpoints. Zero or omitted bend retains straight/polyline behavior. Positive and negative values bend to opposite sides; at full bend the midpoint moves sideways by half the endpoint distance. Width and shoulders follow the curve. GUI Lane tool uses the same operation and adds a Curve / bend slider. Curves require a rebuilt v107+ host. Private v107.1 passed GUI preview/Apply/Undo and real standalone MCP curved placement, stale revision rejection and Undo. No new bridge action or native allowlist entry is needed.


### Editable lane paths (v108 source)
The GUI now exposes draggable endpoints, a bend handle, keyboard point nudging, and a Path points section for coordinates and inserting/removing turns. These controls edit only the proposal until Apply. MCP already supplies the same result through `apply_lane.points` (2-32 points) and optional `bend`; no new command or transport change is needed. Nonzero bend requires two endpoints. Private v108.1 native path-control and standalone MCP checks passed. GUI final three-point Apply matched the edited proposal and shared MCP terrain result.


### Editor brush profile (v109 source)
`edit_terrain` also accepts `brush: {profile:"editor-v1", tool, x, y, radius, strength, shape, falloff, targetHeight?, texture?, selection?}`. Tools are `sculpt`, `lower`, `level`, `stamp` (Set height), `smooth`, and `paint`; shapes are round/square/diamond and falloffs soft/linear/hard. Radius is 25-600 world units and strength 1-100. Selection is an optional `{x,y,width,height}` rectangle covering the brush interpolation support.

This is one sample of the GUI brush algorithm. A dragged GUI stroke can contain many samples; each MCP request is one Undo step. `level` without targetHeight samples the original center for that request. To reproduce a flatten stroke, retain its first target across subsequent requests. Explicit level targets are bounded to +/-100000; Set height requires +/-5000. Unselected height brushes follow the existing editor rule of pinning the outer terrain ring to zero; a selection preserves imported edge heights. Paint uses the same deterministic coverage and texture-corner rules as the GUI.

The profile preserves authored entity transforms and uses the GUI saved constraints; it does not invoke legacy resnapping or legacy new-validation-error rejection. A no-change MCP request rejects without committing. The old operation/value/mirror form retains its prior behavior. Native host v109+ is required; schema/server updates alone do not update an older EXE. V109 native standalone MCP passed all 54 tool/shape/falloff cases against the shared helper, including selected footprints, full-state preservation and Undo. Actual GUI selection/protection also passed; this is not an independent 54-case GUI driving matrix.


### Route elevation (v111)
`inspect_routes` adds `routes[].elevation`: sampled centerline distance, position, height, signed preceding-interval grade, cumulative ascent/descent and sampled maximum grades. `evidence` is `sampled-terrain-only`; it is not craft motion or passability. No request schema changes. Detailed samples share a 20,000-sample response budget (10,001 per route maximum); an unavailable profile returns `error` and no partial samples while other route summaries remain. Requires desktop v111+. Native graph/MCP and complete read-only preservation checks passed; this remains terrain analysis, not craft simulation.


### Temporary inspection paths (v112+)
`inspect_routes` accepts optional `points`: 2-32 finite X/Y pairs inside the map. Supplied points replace saved routes for this read only; endpoint buildings remain obstructions. No corridor, GUI sketch, map revision or Undo is created. Requires desktop v112+; v112.1 passed native points/rejection and complete inspection-state preservation. Omit points for older hosts.
