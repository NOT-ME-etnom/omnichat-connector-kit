# Security policy

## Scope

This repository contains static documentation, a JSON Schema, credential-free examples, and a read-only local verifier. It is not an authentication service and does not receive credentials.

## Credential policy

Never place API keys, passwords, cookies, browser sessions, MFA or recovery codes, Keychain content, private endpoints, or personal filesystem paths in:

- repository files or commit history;
- issues, pull requests, discussions, or logs;
- configuration proposals;
- prompts or model responses.

The only valid value for `credential.secretValue` is `null`. The OMNICHAT owner enters a credential directly into the app, where it is stored in macOS Keychain.

## Supply-chain policy

This kit intentionally has no package dependencies, install hook, runtime downloader, auto-updater, shell bootstrap, or executable connector. The optional verifier uses only Node.js built-in modules and reads the checkout without network access.

Contributions that add executable setup, session extraction, credential transport, hidden network calls, or secondary downloads require explicit security review and will normally be rejected.

## Reporting a vulnerability

Use GitHub private vulnerability reporting when it is available for this repository. If it is unavailable, open a minimal public issue requesting a private contact channel; do not include secrets, exploit details, private URLs, or personal data in that issue.

Describe the affected file/version, impact, and a safe reproduction outline. Do not test against accounts or systems you do not own or have permission to assess.

## Supported version

Security fixes target the current `main` branch. Historical snapshots are not guaranteed to receive fixes.
