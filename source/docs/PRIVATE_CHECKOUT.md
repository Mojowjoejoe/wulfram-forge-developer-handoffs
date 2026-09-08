# Private checkout publication guard

Forge's current Publish workflow explicitly pushes `origin` and targets the
official public maps repository. `remote.pushDefault` alone does not redirect it.
Do not use Publish for private work until configurable private targets are
implemented and verified.

Set local Git policy in the maps checkout:

```sh
git config --local wulfram.publishDisabled true
```

Both the Node service/CLI and native Windows publication entrypoints check this
policy before staging, committing, creating a branch, pushing, or opening a PR.
Malformed Boolean configuration also fails closed. Local save, generation, and
export remain available. This is checkout-local configuration, not a setting
automatically inherited by a fresh clone.

Repository diagnostics report the publication policy and explicitly state that
local saves remain available. When the privacy block is enabled, diagnostics do
not suggest resetting origin to the public repository as a repair action.

For older binaries that lack the guard, disable public remotes' push URLs while
retaining their original fetch URLs. This workspace uses the non-routable
`https://invalid.invalid/public-push-disabled` push URL for `origin` and `fork`.
The separately verified `private` remote remains usable for explicit private Git
pushes. This does not retract any previously public commits, forks, or PRs.

Do not remove privacy safeguards or resume public publication without the
repository owner's explicit authorization.
