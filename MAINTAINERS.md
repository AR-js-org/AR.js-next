# Maintainers guide

How releases of `@ar-js-org/ar.js-next` are planned, tracked and cut. The same
process applies to `arjs-plugin-artoolkit` and `arjs-plugin-threejs`; each
repository's `MAINTAINERS.md` adds only what differs.

## Planning: milestones and the roadmap project

- **One milestone per release, per repository**, named after the version
  (`v0.2.1`). Every issue and PR that must ship in that release is assigned
  to it. A release is ready when its milestone has no open items.
- **One organisation project, [AR.js-next roadmap](https://github.com/orgs/AR-js-org/projects/2)**,
  collects the milestones of all three repositories. Cross-repo work (for
  example a change to the marker event contract) appears there as linked
  issues in each affected repository, assigned to milestones that ship
  together.
- Open a **release issue** from the "Release" issue template when work on a
  version starts. It holds the checklist below and links the milestone.

### Release order across repositories

The packages depend on each other through the event contract, not through
npm dependencies. When a release changes the contract, ship in this order:

1. `arjs-plugin-threejs`, if it must accept the new payload first (it reads
   old and new spellings during a transition);
2. `arjs-plugin-artoolkit`, which emits the payload;
3. `ar.js-next`, whose examples and docs use both.

## Cutting a release

Releases are cut by **pushing a tag**. Two workflows fire on `v*.*.*`:

| Workflow      | Does                                                          |
| ------------- | ------------------------------------------------------------- |
| `release.yml` | Builds, zips `dist/` and `types/`, creates the GitHub Release |
| `publish.yml` | Builds and publishes to npm                                   |

Both run the workflow files **as they exist at the tagged commit**, so the
order below is load-bearing.

1. Milestone has no open items; CI is green on `dev`.
2. On a branch off `dev`: bump `version` in `package.json` (and
   `package-lock.json`, via `npm version <x.y.z> --no-git-tag-version`),
   update `README.md` / upgrade notes. PR into `dev`, merge.
3. PR `dev` → `main`, merge.
4. Tag **the merge commit on `main`**, after the merge, never before:

   ```bash
   git switch main && git pull --ff-only
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

5. Re-sync `dev`: GitHub always creates a merge commit, so `main` now has a
   commit `dev` lacks.

   ```bash
   git switch dev && git merge --ff-only origin/main && git push
   ```

6. Verify: the GitHub Release exists with its zip and npm shows the new
   version (`npm view @ar-js-org/ar.js-next version`). Close the milestone.

## Recovering a partial release

The two workflows are independent, so a failed npm publish does not lose the
release assets. To retry the publish, open the failed `publish.yml` run that
the tag push started and use **Re-run failed jobs**: the re-run keeps the tag
as its ref, so it checks out the tagged tree and publishes. Do not start
`publish.yml` by hand with the `tag` input instead. A manual run checks out
the branch it is dispatched from rather than the tag, and publishes only when
the `publish` input is `true` (the default is `false`). Re-running
`release.yml` is safe as well (`gh release upload --clobber`).
