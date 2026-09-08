

### Creative base layouts — desktop v74+

`generate_base_layout` uses the editor's creative generator. Supply `sessionId`, current `expectedRevision`, explicit `previewOnly`, and `request` containing `activeLayoutId`, a **new** `layoutId`, `style`, `seed` and `placement`. Placement requires `size` (small/standard/large/massive), world-unit `x`, `y`, `radius`, and degree `rotation`; optional controls are `targetCount` (0 automatic or 6–120), `checkAccess`, `terrainAware`, `entranceDegrees`, and Offset-only `offsetArrangement` (classic/wide-front/deep-court/split-wings).

Preview with `previewOnly:true` returns the candidate layout without editing or changing history. Apply with `false`, the same settings and a current revision adds and activates a new layout in one Undo step. Existing layouts remain stored; their buildings are not merged into the new layout. Duplicate IDs and stale revisions reject. The generator checks fit/power; requested access checks are sampled editor evidence, not driving or combat proof. This command requires the rebuilt v74 host and updated server package together.


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
