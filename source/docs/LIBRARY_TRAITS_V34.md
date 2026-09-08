# Base library composition traits v34

The library now supports a composition-trait filter, searchable trait text, trait labels on cards and details, and an explanation of every threshold. Traits describe the displayed deterministic sample; they are not terrain suitability, coverage, balance or distinct-family certification.

| Trait | Rule |
| --- | --- |
| Starter count | 1–15 modeled structures |
| Service yard | At least two modeled repair/refuel pads |
| Multiple service pads | At least four modeled repair/refuel pads |
| Defense heavy | At least half of modeled structures belong to the catalog defense category |
| Darklights present | At least one modeled Darklight |
| No service pads | Zero modeled repair/refuel pads |
| Elongated footprint | Positive footprint dimensions with long/short ratio at least 2.5 |

Unmodeled units remain excluded. Defense classification now uses the catalog category rather than a separate token list. Shields and heavy silos are catalog defenses but lack supported model mappings in the current editor, so this does not introduce them or claim they appear in these counts. Counts and diagram captions now say defensive structures.

## Catalog inventory

Run `node --experimental-strip-types tools/inventory-base-library.mjs`. Its output, `outputs/base-library-inventory-v34.json`, records all 74 source templates, the actual merged 79-template runtime collection, and 15 creative families. It includes source collection, identity, counts, traits and footprint for 376 samples over the four sizes. There are zero sample-generation errors. Fixed arrangements repeat across size samples; this does not inflate the catalog or family count. User favorites are excluded from the shipped-catalog inventory.

Four exact unit-record duplicate pairs were found between source spellings `groenendael` and `groenendale`: team 1 base 2, team 1 base 3, team 2 base 2, and team 2 base 3. Comparison sorts complete known unit records (token, subtype, offset, ground offset, rotation, active). It does not establish footprint-metadata equivalence, approximate geometric similarity or gameplay equivalence. Both source identities remain available; nothing was deleted.

## Private artifact and validation

- EXE: `dist/desktop/library-traits-v34/WulframForge.exe`, version `0.7.0-creative.34`.
- SHA-256: `156D32AEE25333160FF08C0D488D973220904CA45C53C66C5CCEF8A9C8DBFD72`.
- Typecheck, scoped lint and desktop build passed.
- Full source suite: 273 tests, 272 passed, one existing skip; `outputs/library-traits-v34-source.log`.
- Native `outputs-desktop-test-p7brLw/report.json` passed defense-heavy/service-yard filtering, details, Reset and whole-map nonmutation, followed by standard terrain/base, Undo/Redo, export and restart checks. `library-composition-traits.png` was visually reviewed.

This completes the shipped-catalog inventory and computed composition tagging milestone. Hand-reviewed topology labels, overlap UI, broader compact/keyboard filter acceptance and the proposed new-family quality gates remain open. No new creative family or real-game acceptance is claimed.
