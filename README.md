# OMNICHAT Connector Kit

Public, credential-free documentation for preparing a model connection proposal for **OMNICHAT 1.0** on macOS.

> **Reading this repository does not grant access to OMNICHAT or connect a model.** It only explains how to prepare a configuration proposal. A real connection requires the owner to review and enter the values in OMNICHAT, store any credential in macOS Keychain, and run an explicit diagnostic. OMNICHAT does not currently import these files.

## Start here

- Human and model handoff: [CONNECT_TO_OMNICHAT.md](CONNECT_TO_OMNICHAT.md)
- Machine-readable proposal schema: [schema/provider-configuration-proposal.schema.json](schema/provider-configuration-proposal.schema.json)
- Safe examples: [examples/](examples/)
- Instructions for AI agents: [AGENTS.md](AGENTS.md)
- Security boundary: [SECURITY.md](SECURITY.md)

## What this kit does

It gives another model or agent a stable format for returning:

- the existing OMNICHAT provider slot to use;
- model and endpoint values for the owner to review;
- supported task and hyperparameter suggestions;
- unknown values and official sources;
- verification fields kept empty until diagnostics run inside OMNICHAT.

## What it does not do

- It is not a remote-control protocol, plugin, login bridge, or credential exchange.
- It does not make consumer subscriptions equivalent to API access.
- It does not extract browser sessions, cookies, Keychain values, or desktop-app logins.
- It does not create a new provider type; OMNICHAT 1.0 uses its existing slots.
- It does not prove a live connection merely because an app is installed or open.

## Supported slots

`codexLocal`, `openAI`, `gemini`, `anthropic`, `deepSeek`, `openRouter`, `huggingFace`, `ollama`, `anythingLLM`, and `compatible`.

Use `compatible` for an existing OpenAI Chat Completions-compatible endpoint. Remote endpoints must use HTTPS; local HTTP is limited to loopback.

## Optional local verification

The repository has no package dependencies or install hook. If Node.js is already available:

```sh
node verification/verify.mjs
```

The verifier only reads this checkout. It does not contact providers, inspect credentials, or modify OMNICHAT. It enforces this repository's security profile and examples; it is not a general-purpose Draft 2020-12 JSON Schema engine.

## Español

Este repositorio no conecta un modelo por sí solo. Sirve para que otro modelo prepare una propuesta revisable y sin secretos. La conexión real se completa manualmente dentro de **Conexiones** en OMNICHAT y sólo se considera live después de una inferencia explícita.

License: [MIT](LICENSE).
