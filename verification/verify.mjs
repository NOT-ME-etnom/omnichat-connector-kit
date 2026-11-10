import { lstat, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const canonicalSchemaURL = "https://raw.githubusercontent.com/NOT-ME-etnom/omnichat-connector-kit/main/schema/provider-configuration-proposal.schema.json";
const publicFileAllowlist = [
  ".gitignore",
  "AGENTS.md",
  "CONNECT_TO_OMNICHAT.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "SECURITY_REVIEW.md",
  "examples/anythingllm-loopback.proposal.json",
  "examples/ollama-loopback.proposal.json",
  "examples/openai-compatible.proposal.json",
  "omnichat.connector.json",
  "schema/provider-configuration-proposal.schema.json",
  "verification/verify.mjs"
];

const slotMetadata = new Map([
  ["codex", { kind: "codexLocal", displayName: "Codex local", credentialRequired: false, entryMethod: "codex-cli-session" }],
  ["openai", { kind: "openAI", displayName: "OpenAI", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }],
  ["gemini", { kind: "gemini", displayName: "Gemini", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }],
  ["anthropic", { kind: "anthropic", displayName: "Claude (Anthropic)", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }],
  ["deepseek", { kind: "deepSeek", displayName: "DeepSeek", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }],
  ["openrouter", { kind: "openRouter", displayName: "OpenRouter", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }],
  ["huggingface", { kind: "huggingFace", displayName: "Hugging Face", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }],
  ["ollama", { kind: "ollama", displayName: "Ollama local", credentialRequired: false, entryMethod: "none" }],
  ["anythingllm", { kind: "anythingLLM", displayName: "AnythingLLM", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }],
  ["compatible", { kind: "compatible", displayName: "Endpoint compatible", credentialRequired: true, entryMethod: "owner-enters-in-omnichat" }]
]);
const allowedTasks = new Set(["general", "coding", "research", "longContext", "creative", "critique", "extraction", "privateLocal"]);
const allowedReasoning = new Set([null, "none", "low", "medium", "high", "xhigh", "max"]);
const allowedVerbosity = new Set([null, "low", "medium", "high"]);
const officialHosts = new Map([
  ["openAI", "api.openai.com"],
  ["gemini", "generativelanguage.googleapis.com"],
  ["anthropic", "api.anthropic.com"],
  ["deepSeek", "api.deepseek.com"],
  ["openRouter", "openrouter.ai"],
  ["huggingFace", "router.huggingface.co"]
]);
const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function fail(message) {
  failures.push(message);
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function onlyKeys(object, allowed, label) {
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    fail(`${label}: expected object`);
    return;
  }
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) fail(`${label}: unexpected field ${key}`);
  }
}

function requireKeys(object, required, label) {
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    fail(`${label}: expected object`);
    return;
  }
  for (const key of required) {
    if (!Object.hasOwn(object, key)) fail(`${label}: missing required field ${key}`);
  }
}

function validNullableNonnegative(value) {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

async function text(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function listFiles(directory = root) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === ".unlazy") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`${normalize(path.relative(root, absolute))}: symbolic links are forbidden`);
      continue;
    }
    if (entry.isDirectory()) output.push(...await listFiles(absolute));
    else output.push(absolute);
  }
  return output;
}

function validateEndpoint(proposal, filename) {
  const kind = proposal.providerIdentity?.kind;
  const raw = proposal.editableConfiguration?.baseURL;
  if (kind === "codexLocal") {
    if (raw !== null) fail(`${filename}: codexLocal baseURL must be null`);
    return;
  }
  if (typeof raw !== "string") {
    fail(`${filename}: baseURL must be a URL string`);
    return;
  }
  let url;
  try { url = new URL(raw); } catch { fail(`${filename}: invalid baseURL`); return; }
  if (url.username || url.password || url.hash) fail(`${filename}: URL contains forbidden credentials or fragment`);
  const host = url.hostname.toLowerCase();
  const isLoopback = loopbackHosts.has(host);
  if (kind === "ollama" || kind === "anythingLLM") {
    if (!isLoopback || !["http:", "https:"].includes(url.protocol)) fail(`${filename}: local provider must use loopback`);
  } else if (kind === "compatible") {
    if (!(url.protocol === "https:" || (url.protocol === "http:" && isLoopback))) fail(`${filename}: compatible endpoint policy failed`);
  } else if (officialHosts.has(kind)) {
    if (url.protocol !== "https:" || host !== officialHosts.get(kind) || (url.port && url.port !== "443")) fail(`${filename}: official endpoint policy failed`);
  } else {
    fail(`${filename}: unknown provider kind`);
  }
}

function validateProposal(proposal, filename) {
  const topRequired = ["$schema", "schemaVersion", "documentType", "target", "providerIdentity", "editableConfiguration", "credential", "verification", "unknowns", "sources"];
  onlyKeys(proposal, [...topRequired, "notes"], filename);
  requireKeys(proposal, topRequired, filename);
  onlyKeys(proposal.target, ["application", "interface", "importSupported", "manualEntryRequired"], `${filename}.target`);
  requireKeys(proposal.target, ["application", "interface", "importSupported", "manualEntryRequired"], `${filename}.target`);
  onlyKeys(proposal.providerIdentity, ["id", "kind", "displayName"], `${filename}.providerIdentity`);
  requireKeys(proposal.providerIdentity, ["id", "kind", "displayName"], `${filename}.providerIdentity`);
  onlyKeys(proposal.editableConfiguration, ["model", "baseURL", "isEnabled", "isWorkhorse", "supportedTasks", "hyperparameters", "inputCostPerMillion", "outputCostPerMillion"], `${filename}.editableConfiguration`);
  requireKeys(proposal.editableConfiguration, ["model", "baseURL", "isEnabled", "isWorkhorse", "supportedTasks", "hyperparameters", "inputCostPerMillion", "outputCostPerMillion"], `${filename}.editableConfiguration`);
  onlyKeys(proposal.editableConfiguration?.hyperparameters, ["temperature", "topP", "maxOutputTokens", "reasoningEffort", "verbosity"], `${filename}.hyperparameters`);
  requireKeys(proposal.editableConfiguration?.hyperparameters, ["temperature", "topP", "maxOutputTokens", "reasoningEffort", "verbosity"], `${filename}.hyperparameters`);
  onlyKeys(proposal.credential, ["required", "entryMethod", "secretValue"], `${filename}.credential`);
  requireKeys(proposal.credential, ["required", "entryMethod", "secretValue"], `${filename}.credential`);
  onlyKeys(proposal.verification, ["status", "highestVerifiedStage", "checkedAt", "evidence"], `${filename}.verification`);
  requireKeys(proposal.verification, ["status", "highestVerifiedStage", "checkedAt", "evidence"], `${filename}.verification`);

  if (proposal.$schema !== canonicalSchemaURL) fail(`${filename}: wrong $schema URL`);
  if (proposal.schemaVersion !== "1.0") fail(`${filename}: wrong schemaVersion`);
  if (proposal.documentType !== "omnichat-provider-configuration-proposal") fail(`${filename}: wrong documentType`);
  if (proposal.target?.application !== "OMNICHAT" || proposal.target?.interface !== "manual-connections-ui" || proposal.target?.importSupported !== false || proposal.target?.manualEntryRequired !== true) fail(`${filename}: target boundary is invalid`);

  const expected = slotMetadata.get(proposal.providerIdentity?.id);
  if (!expected || expected.kind !== proposal.providerIdentity?.kind) fail(`${filename}: provider slot/kind mismatch`);
  if (!expected || expected.displayName !== proposal.providerIdentity?.displayName) fail(`${filename}: provider displayName mismatch`);
  if (!expected || expected.credentialRequired !== proposal.credential?.required) fail(`${filename}: credential requirement mismatch`);
  if (!expected || expected.entryMethod !== proposal.credential?.entryMethod) fail(`${filename}: credential entryMethod mismatch`);
  if (proposal.credential?.secretValue !== null) fail(`${filename}: secretValue must be null`);

  const configuration = proposal.editableConfiguration;
  if (typeof configuration?.model !== "string" || configuration.model.length < 1 || configuration.model.length > 300) fail(`${filename}: invalid model`);
  if (configuration?.isEnabled !== false || configuration?.isWorkhorse !== false) fail(`${filename}: proposal must be disabled and non-workhorse`);
  if (!Array.isArray(configuration?.supportedTasks) || configuration.supportedTasks.length < 1 || new Set(configuration.supportedTasks).size !== configuration.supportedTasks.length || configuration.supportedTasks.some(task => !allowedTasks.has(task))) fail(`${filename}: invalid supportedTasks`);
  if (!validNullableNonnegative(configuration?.inputCostPerMillion) || !validNullableNonnegative(configuration?.outputCostPerMillion)) fail(`${filename}: invalid cost metadata`);

  const hp = configuration?.hyperparameters;
  if (!hp || !Number.isInteger(hp.maxOutputTokens) || hp.maxOutputTokens < 1 || hp.maxOutputTokens > 1_000_000) fail(`${filename}: invalid maxOutputTokens`);
  if (hp?.temperature !== null && (typeof hp?.temperature !== "number" || !Number.isFinite(hp.temperature) || hp.temperature < 0 || hp.temperature > 2)) fail(`${filename}: invalid temperature`);
  if (hp?.topP !== null && (typeof hp?.topP !== "number" || !Number.isFinite(hp.topP) || hp.topP < 0 || hp.topP > 1)) fail(`${filename}: invalid topP`);
  if (!allowedReasoning.has(hp?.reasoningEffort)) fail(`${filename}: invalid reasoningEffort`);
  if (!allowedVerbosity.has(hp?.verbosity)) fail(`${filename}: invalid verbosity`);

  const verification = proposal.verification;
  if (verification?.status !== null || verification?.highestVerifiedStage !== null || verification?.checkedAt !== null || !Array.isArray(verification?.evidence) || verification.evidence.length !== 0) fail(`${filename}: a proposal cannot claim verification`);
  if (!Array.isArray(proposal.unknowns) || proposal.unknowns.some(value => typeof value !== "string" || !value.length)) fail(`${filename}: invalid unknowns`);
  if (!Array.isArray(proposal.sources)) fail(`${filename}: sources must be an array`);
  else for (const [index, source] of proposal.sources.entries()) {
    onlyKeys(source, ["title", "url", "claim"], `${filename}.sources[${index}]`);
    requireKeys(source, ["title", "url", "claim"], `${filename}.sources[${index}]`);
    if (typeof source?.title !== "string" || !source.title.length || typeof source?.claim !== "string" || !source.claim.length) fail(`${filename}: invalid source text`);
    try {
      const url = new URL(source?.url);
      if (url.protocol !== "https:" || url.username || url.password) fail(`${filename}: source URL must use credential-free HTTPS`);
    } catch { fail(`${filename}: invalid source URL`); }
  }
  if (proposal.notes !== undefined && (!Array.isArray(proposal.notes) || proposal.notes.some(value => typeof value !== "string" || !value.length))) fail(`${filename}: invalid notes`);
  validateEndpoint(proposal, filename);
}

const publicFiles = await listFiles();
const publicRelative = publicFiles.map(file => normalize(path.relative(root, file))).sort();
for (const expected of publicFileAllowlist) {
  if (!publicRelative.includes(expected)) fail(`missing allowlisted file: ${expected}`);
}
for (const actual of publicRelative) {
  if (!publicFileAllowlist.includes(actual)) fail(`unexpected public file: ${actual}`);
}

for (const file of publicFiles) {
  const info = await lstat(file);
  const relative = normalize(path.relative(root, file));
  if (!info.isFile()) fail(`${relative}: only regular files are allowed`);
  if ((info.mode & 0o111) !== 0) fail(`${relative}: executable permission is forbidden`);
  const buffer = await readFile(file);
  if (buffer.includes(0)) fail(`${relative}: binary/NUL content is forbidden`);
}

const jsonFiles = publicFiles.filter(file => file.endsWith(".json"));
for (const file of jsonFiles) {
  const relative = normalize(path.relative(root, file));
  let parsed;
  try { parsed = JSON.parse(await readFile(file, "utf8")); }
  catch (error) { fail(`${relative}: invalid JSON (${error.message})`); continue; }
  if (relative.startsWith("examples/")) validateProposal(parsed, relative);
}

const schema = JSON.parse(await text("schema/provider-configuration-proposal.schema.json"));
if (schema.$id !== canonicalSchemaURL || schema.additionalProperties !== false) fail("schema: root identity or additionalProperties invariant failed");
if (schema.properties?.$schema?.const !== canonicalSchemaURL) fail("schema: instance $schema must be canonical");
if (schema.properties?.providerIdentity?.oneOf?.length !== 10) fail("schema: fixed provider identity count changed");
if (schema.properties?.editableConfiguration?.properties?.isEnabled?.const !== false || schema.properties?.editableConfiguration?.properties?.isWorkhorse?.const !== false) fail("schema: safe disabled defaults missing");
if (schema.properties?.credential?.properties?.secretValue?.type !== "null") fail("schema: secretValue must be null-only");
if (schema.properties?.verification?.properties?.status?.const !== null || schema.properties?.verification?.properties?.highestVerifiedStage?.const !== null || schema.properties?.verification?.properties?.checkedAt?.const !== null || schema.properties?.verification?.properties?.evidence?.maxItems !== 0) fail("schema: proposal verification must be empty");
if (schema.properties?.sources?.items?.properties?.url?.pattern !== "^https://") fail("schema: sources must be HTTPS-only");
if (!Array.isArray(schema.allOf) || schema.allOf.length !== 11) fail("schema: endpoint/credential conditions changed");

const baseline = JSON.parse(await text("examples/openai-compatible.proposal.json"));
const negativeCases = [
  ["secret value", proposal => { proposal.credential.secretValue = "example-secret-that-must-be-rejected"; }],
  ["enabled provider", proposal => { proposal.editableConfiguration.isEnabled = true; }],
  ["remote HTTP", proposal => { proposal.editableConfiguration.baseURL = "http://remote.example/v1"; }],
  ["URL userinfo", proposal => { proposal.editableConfiguration.baseURL = "https://user:password@provider.example/v1"; }],
  ["executable field", proposal => { proposal.command = "untrusted-command"; }],
  ["slot display name", proposal => { proposal.providerIdentity.displayName = "Misleading Provider"; }],
  ["credential requirement", proposal => { proposal.credential.required = false; }],
  ["schema substitution", proposal => { proposal.$schema = "https://attacker.example/schema.json"; }],
  ["fabricated verification", proposal => { proposal.verification.status = "ready"; proposal.verification.highestVerifiedStage = "liveInference"; }],
  ["insecure source", proposal => { proposal.sources = [{ title: "Bad", url: "file:///private", claim: "Bad" }]; }],
  ["unknown task", proposal => { proposal.editableConfiguration.supportedTasks.push("admin"); }],
  ["negative price", proposal => { proposal.editableConfiguration.inputCostPerMillion = -1; }]
];
let negativeControlsPassed = 0;
for (const [label, mutate] of negativeCases) {
  const proposal = structuredClone(baseline);
  mutate(proposal);
  const before = failures.length;
  validateProposal(proposal, `negative-control:${label}`);
  if (failures.length === before) fail(`negative control was accepted: ${label}`);
  else {
    failures.splice(before);
    negativeControlsPassed += 1;
  }
}

const guide = await text("CONNECT_TO_OMNICHAT.md");
for (const phrase of [
  "Reading this repository does not connect you to OMNICHAT.",
  "no public inbound API",
  "no manifest importer",
  "no active deep-link handler",
  "OMNICHAT_CONNECTOR_OK",
  "AnythingLLM can still send"
]) {
  if (!guide.includes(phrase)) fail(`CONNECT_TO_OMNICHAT.md: missing boundary phrase: ${phrase}`);
}

const manifest = JSON.parse(await text("omnichat.connector.json"));
onlyKeys(manifest, ["schemaVersion", "documentType", "target", "supportedProviderKinds", "handoffDocument", "proposalSchema", "credentialPolicy"], "omnichat.connector.json");
requireKeys(manifest, ["schemaVersion", "documentType", "target", "supportedProviderKinds", "handoffDocument", "proposalSchema", "credentialPolicy"], "omnichat.connector.json");
onlyKeys(manifest.target, ["application", "minimumVersion", "direction", "inboundAPI", "automaticImport", "manualEntryRequired"], "omnichat.connector.json.target");
onlyKeys(manifest.credentialPolicy, ["transport", "storage", "secretValuesAllowed"], "omnichat.connector.json.credentialPolicy");
if (manifest.schemaVersion !== "1.0" || manifest.documentType !== "omnichat-connector-kit-metadata") fail("omnichat.connector.json: identity mismatch");
if (manifest.target?.application !== "OMNICHAT" || manifest.target?.inboundAPI !== false || manifest.target?.automaticImport !== false || manifest.target?.manualEntryRequired !== true) fail("omnichat.connector.json: incorrect connection boundary");
if (manifest.credentialPolicy?.secretValuesAllowed !== false) fail("omnichat.connector.json: secret policy must be false");
if (JSON.stringify(manifest.supportedProviderKinds) !== JSON.stringify([...slotMetadata.values()].map(value => value.kind))) fail("omnichat.connector.json: provider kinds changed");

const privateOrSecretPatterns = [
  [/\/Users\/[A-Za-z0-9._-]+\//, "macOS private path"],
  [/[A-Za-z]:\\Users\\[^\\]+\\/, "Windows private path"],
  [/\bsk-[A-Za-z0-9_-]{12,}\b/, "OpenAI-style secret"],
  [/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{12,}\b/, "GitHub secret"],
  [/\bAIza[A-Za-z0-9_-]{20,}\b/, "Google API secret"],
  [/\bhf_[A-Za-z0-9]{20,}\b/, "Hugging Face secret"],
  [/\bBearer\s+[A-Za-z0-9._-]{20,}\b/i, "bearer token"],
  [/curl[^\n|]*\|\s*(?:sh|bash)\b/i, "download piped to shell"],
  [/\bsudo\s+/i, "privileged shell instruction"],
  [/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/u, "invisible Unicode control"]
];
for (const file of publicFiles) {
  const content = await readFile(file, "utf8");
  for (const [pattern, label] of privateOrSecretPatterns) {
    if (pattern.test(content)) fail(`${normalize(path.relative(root, file))}: detected ${label}`);
  }
}

const verifierSource = await text("verification/verify.mjs");
const allowedImports = new Set(["node:fs/promises", "node:path", "node:url"]);
for (const match of verifierSource.matchAll(/from\s+"([^"]+)"/g)) {
  if (!allowedImports.has(match[1])) fail(`verification/verify.mjs: forbidden import ${match[1]}`);
}
for (const token of [
  ["child", "_process"].join(""),
  ["process", ".env"].join(""),
  ["write", "File("].join(""),
  ["fet", "ch("].join(""),
  ["spawn", "("].join(""),
  ["exec", "("].join("")
]) {
  if (verifierSource.includes(token)) fail(`verification/verify.mjs: forbidden capability token ${token}`);
}

for (const file of publicFiles.filter(candidate => candidate.endsWith(".md"))) {
  const content = await readFile(file, "utf8");
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const localTarget = decodeURIComponent(target.split("#", 1)[0]);
    try { await stat(path.resolve(path.dirname(file), localTarget)); }
    catch { fail(`${normalize(path.relative(root, file))}: broken local link ${target}`); }
  }
}

if (failures.length) {
  console.error(`FAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: ${publicRelative.length} allowlisted public files, ${jsonFiles.length} JSON files, 3 safe proposals, ${negativeControlsPassed} rejected negative controls, 0 detected secrets/private paths.`);
