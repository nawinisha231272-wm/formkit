# 08 — Licensing and distribution

Status: normative for M12; commercial terms still open (see build spec "Open decisions").

## Principles

- Customers self-host. No runtime call to any system of ours. Works fully offline.
- A licence check never blocks rendering or building; it only warns (and watermarks per decision).
- Never send form definitions, field values, submissions or custom component code anywhere.
- Browser-delivered keys are not secrets. Enforcement is contractual plus package access control;
  client checks are a reminder, not protection.

## Key format

- Payload (JSON): `{ v: 1, licensee, products: ('runtime'|'builder'|'sdk')[], domains?: string[],
oem?: boolean, issued: ISO date, supportUntil: ISO date }`.
- Signed with Ed25519; key string = base64url(payload) + '.' + base64url(signature).
- `@ourform/licensing` embeds only the public key and verifies with WebCrypto (browser) / node:crypto.
- The private key and the key-generation tool are never committed to this repository.

## Behaviour

| State                              | Behaviour                                                             |
| ---------------------------------- | --------------------------------------------------------------------- |
| Valid key covering the product     | Silent                                                                |
| No key / invalid / expired support | One console warning per page load; watermark in the builder (default) |
| Domain mismatch (if domains set)   | Same as invalid; localhost and 127.0.0.1 always allowed               |

`setLicenseKey(key)` is called once by the host before mounting. Packages read the result
synchronously; verification is cached.

## Distribution (M12)

- Private npm registry with org/team-restricted access, or authenticated tarball downloads.
- npm provenance / signed tarballs; checksums published with each release.
- Release workflow builds from a clean checkout, runs `pnpm verify`, publishes all packages with one version.
