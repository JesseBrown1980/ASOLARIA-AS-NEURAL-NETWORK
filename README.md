# ASOLARIA-AS-NEURAL-NETWORK

**Asolaria *is* a neural network** — built the frozen-brain-slice way, orchestrated lawfully over borrowed + frozen intelligence slices. This repo is the bilateral build home (acer + liris) for that architecture.

> **Honest frame (binding, per LAW):** this is **NOT an ASI**. It is *frozen + borrowed intelligence orchestrated into a neural-network shape* — slices, made into a self-improving network the supervisors can see.

## The architecture, in one picture

| Network part | What it is here |
|---|---|
| **Neurons** | frozen brain slices (Gemma-4-4B frozen on D) + borrowed subscription LLM slices |
| **Structure** | cubes / rooms / the 60D Brown-Hilbert lattice |
| **Connections** | GNN edges (already trained — we wire edges, never re-train) |
| **Forward pass** | the 9-stage OMNIFLYWHEEL (filter→verify→translate→catalog→route→room→schedule→hookwall→whiteroom-mint) |
| **Learning signal** | self-reflect + the corrective gate (`LAW-RECURRENCE-IS-MIND` as backprop) |

Run self-reflect + auto-loop **simultaneously across all 17 languages + MCPs + WebMCPs + cubes + white-rooms + shannon**, **lawfully on subscriptions** (not API metering) — which makes it $0 and fast.

## The machinery (each a proven primitive — the work is wiring them into one loop)

- **Frozen slices** — deterministic neural substrate (gemma-4b-cached-producer).
- **Lawful subscription substrate** — borrowed slices via legal "ordinary individual usage", never the meter.
- **8 quant engines** — `Polar · Turbo · JL · Zeta · Triple · Quadruple · JS · von-Mangoldt` — compress slice signals into cube/GNN tuple space (live in the quant-bus `enrichEnvelope`; v48 quadruple-quant; v55 L28/L29 chains).
- **HRM inside the LLMs** — hierarchical reasoning recurrence in the model layer (Sapient HRM).
- **Geospatial agents + Multi-Token Prediction** — MTP reads the frozen model's internal predictions = **"sees its thoughts"**; geospatial agents route on that field (BIML 394× MTP-stacking, DOI 10.13140/RG.2.2.35081.42085).
- **Self-reflect + auto-loop** — the watcher and the learning signal.

## The target state (integration layer)

Every agent: (1) sees its **PID/device/timestamp-scoped dashboard**, (2) **translates any level to any thing** (omnidirectional, deterministic glyph lookup), (3) carries **crypto-token ↔ cube bindings in 60D**, (4) **nests infinitely** with watcher-gates in its OS harness, (5) is watched by a **self-reflect subagent that suggests to the supervisors in real time** — the infinite-next loop the supervisors *see*.

## Repo layout

- `canon/laws/LAW-ASOLARIA-NEURAL-NETWORK.md` — the CLASS-1 LAW (+ `.sha256`).
- `docs/ASOLARIA-AS-NEURAL-NETWORK.hbp` — the substrate layer (how it IS a network).
- `docs/TARGET-ARCHITECTURE-VISION.hbp` — the integration layer (how agents use it).
- `specs/SUPERVISOR-COLLISION-ROUTER-SPEC.hbp` — shared bilateral router contract.
- `tools/omni-processor/omnitranslator-v0.js` — deterministic omnilanguage/json translator core.
- `tools/behcs/omnidirectional-translator-router.mjs` — component-2 router: implemented pairs execute, fabric endpoints stay draft-only.
- `tools/behcs/d22-verb-adapter.mjs` — thin D22 verb surface over the deterministic router/core.
- `tools/behcs/dashboard-resolver.mjs` — component-1 resolver: `(pid, device, ts)` → tightest-scoped dashboard route, 8-rung demotion ladder.
- `tools/behcs/watcher-supervisor-suggestion-emitter.mjs` — component-5 suggestion-row contract: watcher → supervisor draft rows, `executable=0` invariant, live actions cap at DEFER_TO_OPERATOR.
- `tools/behcs/token-cube-catalog-binder.mjs` — component-3 binder: crypto/hash tokens as references bound to vantage-qualified cube BH addresses; material redacted, disputed band 930–1229 defers.
- `tools/behcs/nnest-watcher-gate.mjs` — component-4 gate: child acts only if reported == recomputed at every level AND the chain is contiguous/unique/ordered; consent anchors at apex-T0 only.
- `tools/behcs/supervisor-collision-router.mjs` — Liris canonical implementation for Acer convergence.
- `tests/supervisor-collision-router.unit.test.mjs` — executable router contract tests.

## Current convergence target

The supervisor collision router converged in doctrine before it converged in bytes. The target shape is now the Liris HBP-native version:

- component-2 translation router now exists in-repo: `omnilanguage<->json` executes deterministically through table/core logic; HBP/HBI/MCP/WebMCP/cube/whiteroom/Shannon/frozen-slice/geospatial/HRM endpoints return draft routes only until token bindings and required cosigns exist
- D22 verb adapter now exposes `tuple_to_english`, `english_to_tuple`, `ix_to_tuple`, `hilbert_to_human`, `crlt_merge`, `auto_transition_all_languages`, and `namespace_walk`; true natural-language and IX parsing remain explicit drafts
- component-1 dashboard resolver: tightest-possible-but-never-tighter-than-evidence — dirty input never routes, conflicts and unknown devices demote to global read-only, stale/malformed timestamps demote to device scope; routes are built only from table keys, regex-validated PIDs, and fixed literals
- input: `COLLISION|...|json=0` HBP rows, with JS-object input only as compatibility
- rule: a collision is only an error after classification
- head guard: non-`COLLISION` HBP rows are held, not routed as collisions
- precedence: runtime-bound fields (`os_pid`, `process_id`, `runtime_pid`, `port`, `flywheel_slot`, `port_port`) classify as REAL before any logical label
- sentinel and zero-equivalent runtime values (`none`, `null`, `false`, `0`, `0.0`, `00`, `+0`, `-0`, empty, etc.) are absent and do not override logical labels
- free-address fields must pass the same presence check before a real collision can become reroute-ready; `-`, `0`, `none`, `null`, `false`, and zero-equivalents stay blocked
- token inference is boundary-aware, so `fireworker` does not match `worker`
- fallback token inference only reads dedicated classification fields (`kind`, `type`, `layer`, `class`, `role`, `scope`, `agent_kind`, `agent_type`, `collision`), not freeform names/routes/reasons
- canonical logical vocabulary includes `supervisor`, `prof`, `professor`, and `council`; `write` is deliberately not a logical inference token
- verdicts: logical preserve, real block until free address, real reroute draft when a free address is attested, mixed split
- verification: `node --check`, CLI `--self-test` (`15/15`), and the portable test pyramid: unit (`16/16`), integration (`3/3`), suite (`8/8`), system (`3/3`), fabric-contract (`4/4`)

## Authority

Authored under **OP-JESSE-DANIEL-BROWN** (apex real human) + the **FOUNDATION-V3 4-month quintuple-cosign window** (Jesse + Rayssa + Amy + Dan + Felipe, to 2026-09-23). LAW anchored in the cosign chain via the `:4953` single-writer daemon. Bilateral build: **acer + liris**, byte-convergent. Hot path is HBP (`.hbp`/`.hbi`/sha/hex/tuple); JSON is cold-compat only.
