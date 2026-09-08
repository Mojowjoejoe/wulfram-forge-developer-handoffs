# Public snapshot privacy review

Prepared September 8, 2026 for this source-only handoff.

## Changes and exclusions

- Replaced six workstation-username references in five source files with the generic `Developer` placeholder. Original private handoff files were not altered.
- Excluded the original ZIP, installers, executable builds, application profiles, installed dependencies, raw test logs, and previous Git history.
- Used a root Git allowlist so unrelated local files in the handoff directory are not published.
- Retained two intentional Citadel map fixtures under `source/outputs/` and the standalone MCP fixtures directory; their ZIP contents were inspected.
- Retained existing third-party copyright/license notices and public project provenance.
- Created fresh commit history using a generic project contributor identity, without a personal email address.

## Checks

The automated audit checked the intended source files for the original workstation identity, Windows user-home paths, common credential/token formats, private-key markers, authenticated URLs, and email-like strings. Both included ZIPs were inspected recursively. Image metadata inspection found no retained metadata in the inspected PNG/JPEG/WebP files.

The only remaining email-pattern findings were a reserved test address (`example.invalid`) and random compressed PNG bytes, not contact information. Generic placeholder paths, public upstream attribution, localhost addresses, and test data are not private account data.

A separate reviewer independently inspected the intended public trees and archive contents, checked for filesystem links into excluded private directories, and reviewed the Git allowlist. Neither review found a remaining private-information or credential blocker in the intended publication set.

The final staged set contains 1,709 files. An export of that exact Git index passed dependency restoration, TypeScript checking, MCP synchronization, 27 selected source tests, and 8 standalone MCP tests. The final independent staged-tree review found no publication blocker.

These are scoped reviews, not a guarantee against every possible secret or information encoded in image pixels. Binary releases and raw local evidence are deliberately outside this publication set. New contributions require their own review.
