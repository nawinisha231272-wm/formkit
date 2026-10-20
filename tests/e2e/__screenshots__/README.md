# Visual baselines by platform

Playwright selects `{platform}-{arch}/{testFilePath}/{projectName}/{arg}{ext}`. The original 60 Mac
PNGs live under darwin-arm64/ and retain their exact bytes. Linux-x64 PNGs are generated only inside
the official Playwright image pinned in scripts/playwright-container.json. The image tag matches
@playwright/test 1.56.1 and includes a registry digest; CI uses that same image on an x64 runner.

```sh
sh scripts/linux-visuals.sh record  # generates missing Linux files; does not replace reviewed files
sh scripts/linux-visuals.sh check   # compares against existing platform-selected files
```

The wrapper runs linux/amd64 even on Apple Silicon, copies source into a disposable filesystem and
installs Node 22.22.3/pnpm 10.10.0 plus frozen dependencies there. It never mounts macOS node_modules
or writes Linux dist output into the workspace. Logs/artifacts are in ignored visual-results/.
It runs the complete 60-case visual matrix with one worker, retaining semantic/axe/state assertions,
then repeats it without snapshot updates. It copies baselines back only after both runs succeed. The
existing 2% pixel thresholds are unchanged. Recording refuses any existing Linux PNG, so it cannot
overwrite a reviewed baseline. It uses `--update-snapshots=all` only in that new empty Linux directory;
missing-only mode deliberately fails a new snapshot assertion in CI. No macOS PNG is regenerated.

References: [official Playwright Docker guidance](https://playwright.dev/docs/docker) and
[platform-dependent visual comparisons](https://playwright.dev/docs/test-snapshots). Keep the browser
package, container image and pinned toolchain aligned. Local Linux Docker visuals do not count as
GitHub Actions performance measurements. This change does not certify a remote CI run as green.
