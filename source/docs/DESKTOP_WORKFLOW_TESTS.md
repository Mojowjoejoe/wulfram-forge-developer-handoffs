# Automated Windows editor acceptance

The user requested autonomous testing instead of repeated manual acceptance.
`npm run test:desktop` now exercises the packaged Windows EXE via its existing,
opt-in WebView2 debugging connection. This is not a substitute generator simulation.

## Run

From the editor checkout, with Node 22+ and Edge WebView2 installed:

```powershell
npm run test:desktop
npm run test:desktop -- dist/desktop/win-x64/WulframForge.exe ../balanced-map-evidence/test2-fixed-v1/test2-fixed.zip
```

Optional arguments are the EXE and an importable generated map ZIP. The default
fixture is `../balanced-map-evidence/terrain-first-rc20/native-test-start.zip`.
Build first when app code changes. Test-only runner changes require no rebuild.

Each run creates a unique, git-ignored `outputs-desktop-test-*` directory with a
copied application, isolated browser profile, screenshots, completed project,
downloaded map and `report.json`. It hashes the EXE and fixture and checks input
preservation. Failure exits nonzero and captures visible error context when possible.
Receipts and profiles stay local; they may contain map metadata. Nothing is uploaded.

The runner launches and stops only its own process. It never attaches to the
user's open editor, modifies the user's profile, or persists debug settings.
It uses an ephemeral loopback debugging port. Do not expose that port or use a
personal browser profile. Test outputs are retained for diagnosis, not deleted.

## Coverage

- Import using the editor's actual file input and handler.
- Fill terrain-detail controls, preview, verify Apply becomes enabled, apply.
- Confirm an explicit empty terrain-first project remains incomplete until bases.
- Use actual Undo/Redo buttons; compare saved terrain and entity snapshots.
- Fill Random base controls, preview and apply 22 combat structures.
- Verify preserved terrain, cleared stage marker, full independent validation.
- Click Export map, read the downloaded ZIP and independently validate its map.
- Close and relaunch the EXE with the same isolated profile; compare saved state.
- Capture renderer exceptions and screenshots for visual review.

Buttons are scrolled into view and must be visible, enabled and unobstructed;
WebView2 mouse events trigger them. Input fields use native DOM setters/events.
No React state, generated candidate or validation verdict is injected. File-picker
selection is supplied through the browser testing protocol; Windows shell dialogs,
installer/SmartScreen and live Wulfram matches are not covered. Screenshots require
visual review; a data PASS alone is not rendering or gameplay-balance proof.

## Bugs caught and fixed

RC20's generator cleared `generator.stage`, but its UI Apply handler copied only
entities/layout metadata. The actual EXE test caught the stale incomplete marker.
RC22 carries that transition through Apply and marks project metadata dirty. It
also replaces only the exact auto-generated `Terrain only — bases required` name
after successful completion; custom layout names remain unchanged.

RC22 is a private, unsigned build. Earlier packages are retained. The previous
RC20 manual-only blocker is superseded by this user-requested automated EXE path.

## Verified RC22 evidence

- Main suite: 110 passed, 1 existing skip; workflow suite: 4 passed.
- Typecheck, lint and diff whitespace checks passed.
- Real EXE workflow passed on terrain-only Test2 balanced and populated Test2 Fixed.
- Empty fixture receipt: `../outputs-desktop-test-Yt1loq/report.json`.
- Populated fixture receipt: `../outputs-desktop-test-mrQAch/report.json`.
- The reopened empty-fixture screenshot was visually inspected: rendered mountains,
  22 units, Generated balanced bases name, valid state and zero placement errors.
- Screenshot capture brings the page forward and moves the pointer (no click) to
  request a fresh on-demand 3D frame. Earlier idle captures were blank; they are
  retained, not presented as visual passes.
- RC22 archive CRC and packaged EXE byte parity verified; Authenticode NotSigned.
- ZIP SHA-256: `0cf17e616bd7f3a626234e4e8db33276c839b84ff37c309061773e4f98f28a1a`.
- Public push remains disabled. No source push or release publication performed.
