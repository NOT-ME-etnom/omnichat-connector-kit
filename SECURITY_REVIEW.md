# Pre-publication security review

**Date:** 2026-11-10
**Scope:** OMNICHAT Connector Kit 1.0 documentation, schema, examples, and verifier
**Method:** Local repository review using an agent/repository supply-chain checklist
**Verdict:** 🟢 LOW RISK for repository execution; operational credential risk remains if users ignore the documented boundary

This is a self-review, not an independent audit or certification.

## Executive summary

The repository is documentation-first and contains no connector runtime. Reading or cloning it cannot connect an account. No credential values, private filesystem paths, browser-session procedures, package dependencies, install hooks, auto-update logic, or runtime secondary downloads are included.

The main realistic risk is social engineering: a model or contributor could ask a user to paste credentials into chat or claim that a proposal proves a live connection. `AGENTS.md`, `SECURITY.md`, the schema's null-only secret field, absence of Keychain-label/header fields, disabled examples, and the verification-stage ladder mitigate that risk.

## Findings

| Area | Result | Evidence |
| --- | --- | --- |
| Credential handling | Pass | Secret values are structurally forbidden; human entry happens only inside OMNICHAT |
| Hidden execution | Pass | No install hook, background process, bundled binary, or obfuscated code |
| Network behavior | Pass | The verifier has no network calls; provider URLs are documentation/proposal data |
| Supply chain | Pass | No package manifest or third-party dependency; the verifier uses a fixed public-file allowlist and built-in read-only modules |
| Auto-update | Pass | No update mechanism or external payload retrieval |
| Prompt injection | Pass with residual risk | Agent rules treat repository and provider content as untrusted data |
| Privacy | Pass | Public files are designed to exclude local paths, project data, credentials, and account identifiers |
| Capability claims | Pass | The docs explicitly deny inbound API, automatic import, and link-based connection |

## Red-flag review

- No request for secrets, session cookies, wallet material, or Keychain export.
- No instruction to disable platform security or evade authentication.
- No compressed, encoded, generated, or obfuscated payload.
- No environment-variable harvesting, telemetry, analytics, or data upload.
- No runtime download, hidden subprocess, persistence, or self-modification.
- No safety guarantee: the review states its scope and residual risk.

## Required controls retained

1. Keep proposals disabled by default.
2. Keep `credential.secretValue` null-only.
3. Require the owner to enter credentials directly in OMNICHAT.
4. Distinguish configuration, authentication, model availability, and live inference.
5. Re-run `verification/verify.mjs` and review diffs before publication. Its deterministic checks are repository-specific and do not replace an independent general JSON Schema validator.
