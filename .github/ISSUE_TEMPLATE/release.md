---
name: Release
about: Track a release from planning to publish
title: 'Release vX.Y.Z'
labels: release
---

Milestone: <!-- link to the vX.Y.Z milestone -->
Roadmap: https://github.com/orgs/AR-js-org/projects/2

## Scope

<!-- One line per headline change; the milestone holds the full list. -->

## Cross-repo dependencies

<!-- Releases in other AR-js-org repositories that must ship before or with this one. -->

## Checklist (see MAINTAINERS.md)

- [ ] Milestone has no open items
- [ ] CI green on `dev`
- [ ] Version bumped and upgrade notes written (PR into `dev`)
- [ ] `dev` merged into `main`
- [ ] Tag `vX.Y.Z` pushed **after** the merge, on `main`
- [ ] `dev` re-synced with `git merge --ff-only origin/main`
- [ ] GitHub Release created with assets
- [ ] npm shows the new version
- [ ] Milestone closed
