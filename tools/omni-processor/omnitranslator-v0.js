"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ASOLARIA_ROOT = path.resolve(__dirname, "..", "..");
const LOG_DIR = path.join(ASOLARIA_ROOT, "logs");
const LOG_FILE = path.join(LOG_DIR, "omnitranslator.ndjson");

const NOVALUM_PATTERN = /novalum/i;
const NOVALUM_CUBE_MARKERS = [103823, 389017, 704969];

const dialects = new Map();
const pairs = new Map();

function registerDialect(id, meta) {
  dialects.set(id, { id, ...meta });
}

function registerPair(from, to, fn) {
  pairs.set(`${from}->${to}`, fn);
}

function listDialects() {
  return Array.from(dialects.values());
}

function listPairs() {
  return Array.from(pairs.keys());
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function logAudit(entry) {
  ensureDir(LOG_DIR);
  fs.appendFileSync(
    LOG_FILE,
    JSON.stringify({
      ...entry,
      ts: new Date().toISOString(),
      chain: "LX-491",
      cube_tags: ["D12_ECHO", "D11_PROOF"],
    }) + "\n",
  );
}

function containsNovalumToken(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (NOVALUM_PATTERN.test(text)) return true;
  return NOVALUM_CUBE_MARKERS.some((marker) => text.includes(String(marker)));
}

registerDialect("omnilanguage", {
  form: "@packet key=val key=val",
  role: "trunk",
  pair_status: "implemented",
  example: "@packet from=liris to=asolaria verb=test.ping input_a=1",
});

registerDialect("json", {
  form: "object",
  role: "neutral interchange",
  pair_status: "implemented",
  example: '{"verb":"test.ping","from":"liris","input_a":"1"}',
});

registerDialect("IX", {
  form: "IX-nnn entry text",
  role: "asolaria sovereign index",
  pair_status: "planned",
  example: "IX-459 beast discovery via tool-packet.txt",
});

registerDialect("LX", {
  form: "LX-nnn entry text",
  role: "local agent-index entries",
  pair_status: "planned",
  example: "LX-491 Omni GNN Trinity Complete",
});

registerDialect("XL", {
  form: "XL runtime event",
  role: "executable runtime artifact",
  pair_status: "planned",
  example: "XL-0 packet dialect from LX-483",
});

registerDialect("plain_english", {
  form: "natural language sentence",
  role: "human operator fallback",
  pair_status: "planned",
  example: "Liris is asking Asolaria to run a test ping with input a=1",
});

registerPair("omnilanguage", "json", (input) => {
  if (typeof input !== "string") throw new Error("omnilanguage input must be string");

  let text = input.trim();
  if (text.startsWith("@packet")) text = text.slice("@packet".length).trim();

  const output = {};
  for (const token of text.split(/\s+/).filter(Boolean)) {
    const eq = token.indexOf("=");
    if (eq <= 0) continue;
    output[token.slice(0, eq)] = token.slice(eq + 1);
  }
  return output;
});

registerPair("json", "omnilanguage", (input) => {
  if (typeof input !== "object" || input === null) throw new Error("json input must be object");

  const parts = ["@packet"];
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    parts.push(`${key}=${text.replace(/\s+/g, "_")}`);
  }
  return parts.join(" ");
});

function translate(input, fromDialect, toDialect) {
  if (!dialects.has(fromDialect)) throw new Error(`unknown from dialect: ${fromDialect}`);
  if (!dialects.has(toDialect)) throw new Error(`unknown to dialect: ${toDialect}`);

  const key = `${fromDialect}->${toDialect}`;
  const fn = pairs.get(key);
  if (!fn) throw new Error(`no translator pair for ${key}`);

  const shielded = containsNovalumToken(input);
  const output = fn(input);
  const result = {
    from: fromDialect,
    to: toDialect,
    output,
    shielded_redacted_across_host: shielded,
  };

  logAudit({
    verb: "omnitranslate",
    pair: key,
    shielded,
    output_preview: (typeof output === "string" ? output : JSON.stringify(output)).slice(0, 200),
  });

  return result;
}

module.exports = { translate, registerDialect, registerPair, listDialects, listPairs };
