# Offset Bastion seed comparison

Current source review: `outputs/offset-visual-variation-v73/report.json` records **48 passing flat-map cases**, twelve seeds for each of small/standard/large/massive. Fitted counts are 12/18/26/34 per team. Each case repeats generation to compare entity geometry, verifies source preservation, checks editor errors and rotational pairing, then applies explicit team entrance policies and recomputes service access. Full editable maps and geometry/file hashes are retained. This does not rerun the older uneven-terrain matrix or native game behavior.

`tools/review-offset-variations.mjs NEW_DIRECTORY` creates the cases and planar comparison images without replacing old evidence. Three seeds were chosen in advance (0, 5, 11), with identical anchor, rotation, count and framing within each size. All four comparison diagrams were opened and reviewed by the primary agent and independently by the critic. Final labeled copies live in `outputs/offset-visual-variation-v73/reviewed/`; `images.json` records their SHA256 hashes. Purple bands are authored reservations, cyan lines are sampled service routes, and colored circles represent conservative structure footprints. Very small circles use a minimum visible marker radius. The views are cropped around one base, so full battlefield connections are not visible.

## Findings

- Small retains two sites, standard three, large four and massive five. The progression is legible; it is not four different families.
- Within each size, seeds rearrange service buildings and defenders locally and can change optional role choices after count fitting. All twelve cases per size retain valid selected-entrance connections under source checks.
- The district centers and bent corridor remain almost identical. `lib/offset-bastion.ts` fixes site centers, jitters each by at most 20 units per axis, then scatters roles roughly 110–215 units around those sites. The diagrams confirm this reads as one plan with local variation.
- These results establish deterministic local variation, not 48 distinct layouts or broad structural diversity. Additional count fitting does not remedy that distinction.
- The critic requested an explicit cropped-view label because cyan routes leave the panels. The corrected images state that limitation. These diagrams are evidence aids, not final native-model catalog cards.

## Consequence for the roadmap

Offset remains experimental. Same-size visual comparison now exists for three flat representatives per size, but it exposes a structural-diversity gap rather than proving that gap closed. Further work should introduce versioned district arrangement or entrance-geometry choices with preserved legacy behavior, then check power, access, pairing and portability for those choices. Dedicated close native views and final family admission remain separate. The existing 15 reviewed-family count is unchanged.

No runtime editor or MCP behavior changed in this review; no new EXE was needed. The accepted private editor and stable launcher selection remain v73.2. No publication, commit or push occurred.
