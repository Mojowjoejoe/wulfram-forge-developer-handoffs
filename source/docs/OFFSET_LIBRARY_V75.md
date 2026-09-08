# Experimental Offset library cards — v75.2

The searchable base library now includes an **Experimental** collection with Classic, Wide Front, Deep Court and Split Wings cards for Offset Bastion. This is one candidate family with four arrangements; the 15 reviewed Creative families are unchanged.

Each card shows repeatable sampled structure centers and the correctly scaled 200 u entrance band. The diagram bounds include the complete corridor band. Selecting a card opens the existing creative placement workflow with its arrangement and size retained; no fixed-template fallthrough or immediate map edit occurs. Cards describe samples, not terrain fit, collision or gameplay balance.

Primary search, collection and size controls remain visible. **More filters** contains count, role, trait and terrain controls, plus their explanations; its summary identifies active hidden filters. This moves the cards higher without removing filter capabilities. Starter descriptions explicitly qualify the partial layouts of Split Wings, Split Gatehouse and Sheltered Harbor.

[Offset building guide](OFFSET_BASTION_GUIDE.md) describes size/arrangement/reroll behavior, editing tradeoffs, entrance binding and nearby-family differences.

## Exact private build

`D:/WulframForgeBuilds/offset-library-v75.2/WulframForge.exe`

SHA-256: `3CC1AF263612AC03E3DCBEFC5A16898949C17869E118FDADB5F1562EB3CCC1F1`.

Select this executable in the stable launcher's **Change editor build** control. The saved launcher selection has not been changed automatically.

## Verification

- `outputs/offset-library-v75-all-tests.log`: 361 source tests, 360 passed and one existing skip, before the final presentation-only refinement.
- Final `outputs/offset-library-final-tests.log`: 4/4 library regressions passed. Final TypeScript and scoped lint passed (`outputs/offset-library-final-typecheck.log`, `outputs/offset-library-final-lint.log`).
- `D:/WulframForgeTestRuns/outputs-desktop-test-k362NY/report.json`: final v75.2 native workflow passed with no renderer errors. It opens all four details, checks distinct corridor diagrams, exercises More filters, verifies unchanged source while browsing, and checks arrangement/size handoff. Deep Court then passes preview invalidation, Apply/Undo/Redo, favorite export/reimport, larger-map reuse, ZIP/reopen and restart.
- `offset-experimental-library.png` in that directory was visually reviewed: all four Starter cards are visible with collapsed advanced filters, their descriptions and counts are readable, and bands have internal padding. The right detail pane remains scrollable for full guidance.
- Earlier v75 receipt `D:/WulframForgeTestRuns/outputs-desktop-test-GoIQOb/report.json` passed before Starter wording and filter layout refinements. It is not the final screenshot or final EXE receipt. V75.1 was built between those revisions and is not the accepted deliverable.

Independent review found no selection/category/diagram-clipping defect, then identified Starter overstatement and excessive filter height; both were corrected and the final native test rerun.

## MCP impact and remaining scope

All four arrangements already use the shared generator exposed by v74 `generate_base_layout` with `style:offset-bastion` and `placement.offsetArrangement`. This sprint changes library discovery/presentation and handoff, not the generation command, transport or native allowlist. No new MCP operation is required. Prior v74 real-MCP receipts retain their exact binary scope; the v75.2 receipt above is GUI acceptance, not a newly claimed MCP end-to-end run.

The full combined baseline remains v71.1. These cards do not imply Offset admission, completion of the 48-family target, game/server support or novice acceptance. Final comparative admission and any remaining imagery requirements must be resolved explicitly. No commit, push, visibility change or public distribution occurred.
