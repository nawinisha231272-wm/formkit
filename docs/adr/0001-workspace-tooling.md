# 0001 — Workspace tooling

Status: accepted
Date: 2026-10-19
Milestone: M00

## Context

The starter depends on global TypeScript and relative source imports. Core imports DOM-bearing SDK definitions.

## Options considered

Keep the single compiler project, or isolate publishable ESM packages in a pnpm workspace.

## Decision

Use pinned pnpm, Turbo dependency-ordered tasks, tsup ESM/declaration builds, strict TypeScript, Vitest projects in Node, Playwright on Chromium/Firefox/WebKit, ESLint package boundaries, Prettier, Changesets and GitHub Actions. Each initial package has a generous 30 kB Brotli file budget enforced by size-limit; raising it requires an ADR.

Move definition types to schema and headless model/property/value contracts to core. SDK wraps a model with portable views; the host supplies the renderer a view map. Builder-core consumes models only. This is the minimum model/view separation needed for M00; the complete SDK and renderer choice remain M02.

## Consequences

Headless packages compile without DOM types. Internal imports use public package exports. Builds precede tests/typechecking to resolve declarations. No external runtime dependencies are added. Vitest uses the projects configuration (the successor to its workspace file). Starter behaviors and known renderer limitations are preserved.
