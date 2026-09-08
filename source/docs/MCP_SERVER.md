# Wulfram Forge MCP — 0.1.0

The local MCP server controls the active, unsaved map in an MCP-enabled Windows desktop editor. The separate candidate is `dist/desktop/mcp-v0.1.0/WulframForge.exe`; launch it with `Launch Forge MCP.cmd`. Import a map through the normal editor. The candidate uses a separate persistent WebView2 profile, preserving the regular editor's autosave.

Requirements: Windows, Edge WebView2, Node 22.13+ with TypeScript stripping, installed dependencies in `tools/mcp`, and an MCP-capable client. The native application includes .NET. This is a local development candidate, not a published release.

## Connect

Install dependencies once with `npm ci --prefix tools/mcp`. Register `tools/mcp/server.mjs` as a STDIO server using an absolute Node executable and script path:

```powershell
codex mcp add wulfram-forge -- node --experimental-strip-types C:/Users/Developer/Documents/Wulframe/wulfram-mapeditor/tools/mcp/server.mjs
```

Restart/reconnect MCP in the client if its current session has already loaded the tool catalog. `codex mcp get wulfram-forge` shows the saved definition. Registration does not launch the editor; the launcher does that. Removing the integration uses `codex mcp remove wulfram-forge`.

## Available tools

| Tool | Behavior |
| --- | --- |
| list_editor_sessions | Discover ready editors without exposing pipe credentials |
| get_editor_state | Read map name, revision, selection, dirty flag and undo/redo counts |
| inspect_map | Read dimensions, entities and active base layout |
| validate_map | Run existing project structure/power/slope/state validation |
| edit_entities | Atomic add/move/remove batch, optional rotational team pairing |
| edit_terrain | Raise/lower/flatten/smooth/texture circular brush, optional mirror |
| capture_view | Actual native PNG capture of the current view, including editor UI |
| undo | Undo the most recent change, manual or MCP |
| save_copy | New JSON snapshot under outputs/mcp-exports |
| export_map | New ZIP export under outputs/mcp-exports |

All operations after discovery require an exact session ID. Edits, undo and exports require the revision obtained from inspection. Revisions change on every project replacement, including undo and manual edits. A successful edit receipt follows the committed React update and includes its new revision. Each edit batch uses one normal editor undo step and marks both save scopes dirty. Exporting a copy does not mark the editor saved.

Use absolute world X/Y and yaw in radians. `mirror:true` matches exactly one opposing entity by token/subtype and rotational position; missing/ambiguous matches reject. Each affected entity can occur only once in a batch. Ground structures snap using existing model bounds. Unsupported placement models are rejected. New project-validation errors reject the entire batch without changing the source. Existing errors are retained and reported; this does not certify runtime clearance or gameplay.

Example after inspection:

```json
{
  "sessionId": "<returned session ID>",
  "expectedRevision": "<returned revision>",
  "edits": [{"operation":"move","id":"team-1-base-tower-upper","x":1560,"mirror":true}]
}
```

If a request times out or disconnects, inspect again before retrying: an edit may have committed even if its response was lost. Tools never automatically retry writes. Multiple editors are separate explicit sessions.

## Transport and boundaries

The MCP protocol runs over STDIO using the official TypeScript SDK. The native bridge uses a current-Windows-user-only named pipe with a random per-session credential. It opens no TCP/debugging port. Session descriptors live in `%LOCALAPPDATA%/BlackwaterGaming/WulframForge/mcp-sessions`; credentials are never returned by MCP tools. The bridge is opt-in through `WULFRAM_FORGE_MCP=1`; ordinary editor launches remain unchanged. Closed/stale descriptors are ignored, and normal application exit removes its descriptor.

Only named editor commands are accepted. There is no shell, arbitrary JavaScript, arbitrary file-write, repository publish, or game deployment tool. `capture_view` captures the current camera; camera-position commands and browser-editor transport are not implemented. The server does not create game support for minions, tower health, progression or victory conditions.

## Build and verify

`powershell -NoProfile -File tools/mcp/build-editor.ps1` builds the candidate without replacing the regular desktop distribution. Close the candidate first when rebuilding it.

```powershell
npm run typecheck
node --experimental-strip-types --test tests/mcp.test.mjs
node --experimental-strip-types tools/mcp/test-desktop.mjs
```

The native acceptance test launches an isolated profile, imports Three Lane Citadel via the actual file input, and then uses MCP STDIO plus the private native pipe for inspection, mirrored edits, stale-revision rejection, invalid-placement rejection, screenshots, terrain changes, undo, JSON/ZIP parity and overwrite rejection. CDP is enabled only in that isolated test process for fixture import. The test restores the map and closes its app; it never changes the user's running editor.

Verified acceptance evidence: `outputs/mcp-native-test-yYulR5/report.json` and `restored-editor.png`. All ten acceptance steps passed. The build reports a WindowsBase assembly-reference warning and the web bundler's large-chunk notice; native startup and the complete MCP roundtrip were successful.

Rebuilt and reverified on 2026-09-06: `outputs/mcp-native-test-G0mbac/report.json` records all ten native acceptance steps passing against the rebuilt candidate. The restored-editor capture was visually inspected. All six MCP tests and TypeScript checks also passed. `codex mcp get wulfram-forge` confirmed the enabled STDIO registration uses `C:\Program Files\nodejs\node.exe` and this workspace's `tools/mcp/server.mjs`. Existing registration was preserved.

## Authored base capture and placement (v82+)

The rebuilt v82 host and updated server expose capture_authored_base and place_authored_base. Capture requires sessionId, expectedRevision, activeLayoutId and sourceFrame {origin:[x,y,z],yaw}; it returns packageJson without editing. Placement requires the same session/revision, packageJson, explicit previewOnly and authoredRequest {activeLayoutId,layoutId,frame,terrainMode}. Use a new layoutId, yaw in radians, and terrainMode preserve or conform. Preview does not change history; apply adds a new layout with one Undo step. Existing layouts remain intact. Rectangular rules require 90-degree delta rotations; starships retain source altitude/rotation. Editor support checks are not game collision proof. Requires the rebuilt host, not only this Node package.


### Saved authored library (desktop v86)

`inspect_authored_library` returns the versioned library and exact raw storage value. Supply the current editor revision to all library tools. `edit_authored_library` also requires `expectedLibraryRaw` (null for absent storage) and `libraryEditJson`: save `{operation:"save",entry:{id,name,base}}`, rename `{operation:"rename",id,name}`, remove `{operation:"remove",id}`, or restore `{operation:"restore",entries}`. The returned `before.entries` can be restored using the returned `raw` as the next expected value. This changes library storage only, never map Undo. Save rejects duplicate IDs/names. Reload after errors; never automatically replay an uncertain write.

`recover_authored_library` takes the inspected damaged raw value, backs up exact bytes and resets to a validated empty envelope. Healthy libraries reject recovery. GUI controls use the same storage code. Libraries belong to the current editor profile; load/export an authored JSON file to transfer an entry to another device. Native transport size limits still apply to large library responses.

### Whole authored-library portability (desktop v87)

GUI: Saved authored bases > Export authored library writes the complete versioned collection. Import authored library shows new/skipped counts; Apply merges, Cancel leaves storage unchanged, and library Undo restores the prior collection. Same-ID identical content is skipped even if JSON key order differs. Changed content under the same ID and case-insensitive name conflicts reject the whole merge. Resolve conflicts at the source; saving as a new copy gives a new ID. Limits remain 50 entries and 2 MB.

MCP: `edit_authored_library` accepts `libraryEditJson` with `{operation:"import",library:<exported envelope>}`. Set `previewOnly:true` to validate without writing. The server dispatches a separate `preview_authored_library` native action, so v86 rejects preview rather than ignoring a new flag and committing. Use the original exact raw storage value to apply; preview does not reserve or lock storage. `inspect_authored_library.library` is the exportable envelope. Library operations remain separate from map Undo.
