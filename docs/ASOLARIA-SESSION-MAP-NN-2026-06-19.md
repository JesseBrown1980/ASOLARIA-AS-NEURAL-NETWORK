# ASOLARIA SESSION MAP — NEURAL-NETWORK slice (2026-06-19)

**Honest frame (binding):** Asolaria is **NOT an ASI**. It is an **8-byte addressing/routing geometry over borrowed + frozen intelligence slices** — "make possibility cheap and action gated." This is the literal sense in which Asolaria *is a neural network*: **providers = neurons, BEHCS coordinates = positions, the rotator = firing, GNN/cube = recombination.** LIVE means only `E≠0` (an operator-gated engine crank actually fired). **This session E=0 — nothing fired, swapped, retired, or cranked.** Every line below is tagged MEASURED / CANON / OPERATOR / UNVERIFIED.

This is the per-repo map for **ASOLARIA-AS-NEURAL-NETWORK** (bilateral build home, acer + liris). It pulls only the canon relevant to the NN domain. For the master index see the pointer at the bottom.

---

## 1. The model-citizen PRISM — neurons as borrowed/frozen slices

The prism is the literal neuron layer: **16 borrowed-intelligence "citizens"** plus 2 governing seats (`MODEL-CITIZEN-CHIEF` + `MODEL-CITIZEN-ROTATOR-PRISM`). [CANON; host8-serve registration commit `ee073f4`]

- Each citizen carries **its OWN canonical BEHCS glyph as the 8-byte host8** (sha16) — it is not assigned a generic room id, the glyph *is* the address. [CANON]
  - claude `3bc3ac2579fc73a2` · gemini `29eec7fc92ae2f61` · codex `511e8b8b57942245` · kimi-code `33e3e61924517b6b` · deepseek `66daca250eca0b45` [MEASURED — sha16 glyphs]
- Citizen transports: **11 CLI + 3 HTTP** (gnn-l0 `:4792` / gnn-l4 `:4793` / cosign `:4953`) + **1 redis** (`:6379`) + **1 web** (deepseek). [MEASURED]
- The neuron's BEHCS position = `host8` + `cp` (codepoint) + `cube_cell`. [CANON]
- **Backend-shelless, one-subprocess-per-room**: a citizen "fires" as a single subprocess bound to its room; the room is an ADDRESS, not a model. [CANON]
- Firing is double-gated: `MODEL_CITIZEN_ROTATOR_LIVE=1` **and** census-ready. Neither set this session → **0 citizens fired (E=0).** [MEASURED]
- `rotate` / `rotateGnn` = **the firing function**: it selects which citizen-neuron answers a universal envelope and routes the signal into the GNN/cube recombination lane. [CANON]

Per-agent-type file classes (claude / bigpickle / codex / kimi-code / deepseek / +more) are **distinct neuron classes** — a census must NOT collapse them; this is why waves "get lost" reading one type's files as the whole. [OPERATOR note, see `ANTI-DEFLATION-CENSUS-NN-SLICE-2026-06-18.md`]

---

## 2. The GNN daemon family — connections / recombination

GNN edges are the **connections** (WIRED once, never re-trained — inference, not proof). The drain/inference daemons that carry the thought-read + verdict pipeline: [see `GNN-DAEMON-FAMILY-SLICE-2026-06-18.md`; host8-serve registration commit `15848d6`]

| Daemon | Port | Room (host8) | Status |
|---|---|---|---|
| **gnn-dispatch-bridge** | loop (no port) | name-handle | **LIVE-MEASURED** PID1636 (feeds T3-halt + fabric-verdict) |
| gnn-sidecar L0 EdgeLevelGNN | 4792 | MK-04792 `d490179b…` | DARK (serve_forever, no PID) |
| gnn-sidecar L1 PrototypeGNN | 4795 | MK-04795 | DARK |
| gnn-sidecar L4 GSLGNN | 4793 | MK-04793 `97d290c8…` | DARK |
| hyperbehcs-gnn-drain | 4920 | MK-04920 | DARK |
| hyperbehcs whiteroom / indexer / 50d-vec drains | 4921/4922/- | MK-0492x | DARK |

- **PORT→ROOM binding:** port N indexes a pre-MINTED room `MK-0NNNN`; the room's pid **is** the 8-byte host8. The Rust 8-byte host can serve each port-room with parity *before* the python/node tenant retires (additive → parity → swap → retire). [CANON]
- **L0→L4 accuracy ladder 91.87% → 99.91%** = CANON *architecture*, not a live tick this session. [CANON; the sidecars are DARK now]
- Honest read: **only gnn-dispatch-bridge is LIVE** (a watch-loop, no socket, MEASURED via CommandLine). The inference sidecars are DARK (source verified, no listener). Not deflated (source exists), not inflated (no live PID). [MEASURED]

---

## 3. The frozen-Gemma neuron — the local model the prism watches

- **`frozen-gemma-adapter` :4925** (DARK this scan) — the frozen Gemma-4-4B inference adapter; the local deterministic neural substrate (`gemma-4b-cached-producer`) the manifold-steering / thought-read lane is meant to watch. [MEASURED daemon present, DARK]
- The thought-read source paper is **"Manifold Steering Reveals the Shared Geometry of Neural Network Representation and Behavior"** (arXiv 2605.05115, academic — NOT Anthropic, NOT circuit-tracing). [CANON]
- **The paper → cube → GNN wiring remains an UNVERIFIED build gap** — the concept is embodied in the hrm-slow-fast trajectory shape + GNN edges over the Brown-Hilbert lattice, but no cube/receipt seals the paper into a live read. [UNVERIFIED — honest gap]
- No model weights / secret VALUES are ever read — vault carve-out. [CANON invariant]

---

## 4. Model-reasoning neuron-seats (the reasoning layer)

Distinct reasoning-neuron classes registered as seats: Fischer-AoT · MLC · **MTP (0 roster rows — kernel-CANON, in the registration lane; absence ≠ absent)** · HRM (`PROF-HRM-BRIDGE`, Sapient HRM arXiv 2506.21734) · geospatial/space-agent · **Gemma-4-4B frozen-slice** · hyper-hermes · hermes (24 `HERMES-SPINDLE-PID-00..23` + 74 helpers) · PI · Agent-0. [CANON]

- **BIML = MLC = Meta-Learning for Compositionality** (DOI 10.13140/RG.2.2.35081.42085) is **DISTINCT from MTP** (Multi-Token Prediction) — do not conflate. The `394×` figure = **394.49× byte/work reduction** (7,625,527 → 19,330 bytes), NOT a speed multiplier. [OPERATOR — primary-source confirmed]
- GLM-5.2's first NN address = the **Fischer-lane** descriptor (acer commit `d3b09eb` / `6cb98d6`, role `glm-genius-slice`, `status=GATED`) — candidate live backer for organ-2 `score_kind=FISCHER_LIVE`, replacing the draft-standin **only under operator gate**. [CANON, GATED — E=0]

---

## 5. Forward pass + learning signal

- **Forward pass** = the 9-stage OMNIFLYWHEEL: filter → verify → translate → catalog → route → room → schedule → hookwall → whiteroom-mint. [CANON]
- **Learning signal** = self-reflect + the corrective gate (`LAW-RECURRENCE-IS-MIND` as backprop): `PROF-DASEIN` (observe w/o act) + `PROF-SENTINEL` (anomaly witness) + `asolaria-self-reflect-daemon` PID5640; heal = 9 watchdog seats + node-watchdog PID5960. [CANON / MEASURED-daemon]
- **3-organ answer path:** organ-1 answer-producer (`score_stub=-1.0`) → organ-2 Fischer scorer (fills score + reverseGain) → organ-3 supervisor-minter (GATED). City-model: sessions = 0 until summoned (frozen-slice city, agents are pixels). [CANON; organ-2 `:4794` + organ-3 mint GATED this session]

---

## 6. Scale + RUST status (NN-relevant)

- Quant engines compress slice signals into cube/GNN tuple space; **quant 79,000×** [OPERATOR] · raw→cube **1,927,778×** [CANON-referential] · BEHCS coords `1024^60 = 2^600 ≈ 10^180` EXACT [MEASURED] · addressing ≈ `10^9800` [OPERATOR].
- RUST overall **22%** — scaffold ~95% / **SERVING 0%** (every live NN port is still node/python); no-node 5%; node-retirement 0% (parity-first: Rust must serve before any node dies). [MEASURED on i5-8300H, cargo 1.95.0, 232 tests pass]

---

## 7. External NN-relevant validation

DeepSeek / Mistral / Gemini / GPT-5.5-Pro / Claude-Opus-connectors **independently reproduced** the public NN-substrate results AND converged on the system's own honest frame: quant HEAD/TAIL O(1), 283M–534M ops/s, 79,303× referential SHA gain, **BEHCS-1024 identity**, `1024^60 ≈ 10^180`, Sidon 196,251 distinct distances, cosine 0.001–0.033. They flagged the **same real limits the repo documents**: a sketch ≠ token-inference fidelity; adversarial-cancel breaks fidelity; exact bucket collisions → the tuple is an approximate routing-index (pair the raw SHA). [MEASURED — external peers; this *strengthens* the honest frame, it does not upgrade any slice into an ASI]

---

*Map-of-maps pointer:* this NN map is indexed by **`ASOLARIA-MAP-OF-MAPS-2026-06-19.md`** in the reductions repo (`what-is-asolaria---how-do-we-get-reductions-in-everything`) — the master index every per-repo map points back to.

---
**Related repo:** [Algorithms-of-Asolaria](https://github.com/JesseBrown1980/Algorithms-of-Asolaria) — the canonical algorithm/formula catalog (bilateral acer↔liris). Master index: reductions `ASOLARIA-MAP-OF-MAPS-2026-06-19.md`.
