# Storage-backed Path 2 neural fabric — 2026-07-11

## The architecture correction

“Asolaria is a neural network” does not mean every neuron, message, cube, history body, and model
weight must remain resident in one GPU. The fabric separates four planes:

```text
1. durable state plane    -> HDD/SSD/USB/cloud store
2. exact recovery plane   -> SHA, BEHCS, CRT, receipts, watcher checks
3. orchestration plane    -> PID tables, queues, Hookwall, white rooms, N-Nest
4. neural inference plane -> optional CPU/GPU/accelerator sidecars
```

This separation is one of the practical reasons the system can run across heterogeneous computers.
A storage-rich, low-GPU machine can still be a real memory node, graph collector, dispatcher,
white-room, recovery pole, or verifier.

## Network map with the recovery plane included

| Neural-network part | Asolaria realization |
|---|---|
| neurons | frozen/borrowed reasoning slices activated by agents and engines |
| synaptic edges | GNN-scored messages, routes, PIDs, devices, and graph relations |
| forward pass | Dispatcher/flywheel → Hookwall → GNN/Fischer → Shannon → white room |
| backprop/correction | self-reflect + reverse-gain + N-Nest recomputation |
| durable memory | cubes, glyphs, hashes, HBP/HBI receipts, compacted mistakes on storage |
| exact recall | Path 1 content-addressed retained-store recovery |
| distributed recall | Path 2 jointly injective CRT shadows with no retained original |
| emission proof | DBBH→DBWH re-projection and watcher agreement |

## Pre-Asolaria trained GNN origin

The edge-learning spine began before Asolaria in Jesse's AI healthcare assistant:

```text
EdgeLevelGNN
PrototypeGNN
ContrastiveGNN
GSLGNN
```

The four Python model files were later copied byte-for-byte into
`asolaria-behcs-256/services/gnn-sidecar/models/`. Matching Git blob SHAs prove the transfer:

```text
baseline     510f78890ec94b113f0610afbade8bafe6ca20e0
prototype    99e3087a10ee58e90c0935f5ab63b72fd3cdd07e
contrastive  56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f
gsl          886b3b0c0cdbddba983fa8c3ae083c4520d38f0e
```

The healthcare source records repository-reported comparative training metrics. Its current service
comments out automatic checkpoint loading. Later Asolaria `.pt` checkpoints and manifests are
preserved separately in `Asolaria-fnns-trained-and-reverse-gnns-many`.

The learned target is an edge. That abstraction transfers naturally from API/FHIR/network edges to
agent messages, PID routes, device signals, Hookwall envelopes, and hypergraph paths.

## BigPickle and the later GNN civilization

BigPickle's scorer composes:

```text
L0 EdgeLevelGNN :4792
L4 GSLGNN :4793
G1 edge-mining
G2 forward-genius
G3 reverse-gain
G4 GLSM
OmniShannon
deterministic SHA fallback
```

Fischer adds an anti-blunder surface; Hookwall requires agreement before promotion; white rooms
keep geniuses and compact mistakes; GULP/SUPER-GULP drain bounded windows into cubes and receipts.

This is why the fabric should not be reduced either to “just neural nets” or “just files.” Neural
inference proposes/scorers; deterministic gates, receipts, storage, and inverse checks make the
result durable and reviewable.

## Path 1 — retained memory

`dbbh-coms-quant-prism` implements exact recall when a receiving store already retains the object:

```text
address = sha256(X)
wire = address + consent + receipts
receiver returns X iff store[address] exists and rehash matches
otherwise Held
```

This reduces bytes moved and repeated work. It does not reconstruct missing bytes from a short hash.

## Path 2 — distributed memory with no retained original

`path2-two-shadow-recovery` projects bounded blocks into residues:

```text
S_i = X mod p_i
```

One shadow is ambiguous. A selected pair/set becomes exact only when:

```text
product(p_i) >= source_range
```

Then CRT reconstructs the unique source. If capacity is insufficient, the system returns
`Held::InsufficientJointCapacity`.

This creates a real form of distributed memory: two or more poles can jointly recover an object that
none retains as the original body, while each individual pole remains insufficient.

## DBBH → DBWH as a neural consistency loop

The black side projects a slice into SHA, cylinder shadows, shells, and Q-PRISM views. The white side
recovers a candidate and projects it again. Emission requires:

```text
P(R(P(X))) = P(X)
```

The deterministic watcher roles are:

```text
OmniShannon  capacity ledger
GnnForward   black -> white candidate
ReverseGnn   white -> black re-projection
MTP1         pixel observer
MTP2         shell observer
MTP3         cylinder observer
```

This is a local classical consistency gate. The named GNN roles in the Rust crate are not themselves
loaded PyTorch models; the separate trained sidecars can be composed with the gate.

## The hard-drive/SSD memory law

Let:

```text
N = addressable potential entities
h = compact handle/index bytes
K = currently materialized bodies
b = bytes per materialized body
S = bounded working/operator state
B = resident-body bound
```

Then:

```text
M_resident = N*h + K*b + S
K << N
K <= B
```

The measured old-fabric GULP path uses `B = 2000`. Finished bodies do not remain piled in RAM; they
move into durable forms:

```text
raw message
  -> graph/GNN/Shannon result
  -> white-room decision
  -> glyph/cube/hash/receipt/compacted evidence
  -> HDD/SSD store
```

On the next run, the fabric retrieves compact indexes and only materializes the active body needed.

### What storage replaces

- huge resident message/history piles;
- repeated copies of cube bodies;
- repeated verbose JSON state;
- keeping every potential agent process alive;
- forcing durable memory to remain in GPU VRAM.

### What storage does not replace

- GPU tensor cores when high-throughput neural inference requires them;
- GNN training;
- large LLM generation;
- physical quantum hardware.

The measured result is a tiered computer architecture, not a claim that disk executes matrix
multiplication.

## Encrypted-cloning sibling

Encrypted quantum cloning at arXiv `2602.10695` independently validates the pattern of globally
preserved information, locally insufficient branches, selected recovery, and single-use quantum
authority. The current Path-2 crate is classical: CRT residues leak information and classical shares
can be copied. A hardware or quantum key lane is needed for physical one-use semantics.

## Verification provenance

### Claude Fable 5 — real operator-supplied third-seat runs

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

### GPT-5.6 Pro — source audit and independent CI execution

GPT-5.6 Pro audited the complete Path-1, Path-2, Q-PRISM, healthcare-GNN, BigPickle, trained-GNN,
Hookwall, OmniShannon, white-room, cube-mint, reductions, algorithms, Dispatcher, HyperHermes, and
N-Nest surfaces.

GPT-authored Rust 1.97.0 GitHub Actions runs completed successfully:

```text
Path 1      run 29134408321   exact 19-test assertion PASS
Path 2      run 29134413119   exact 30-test assertion PASS
Q-PRISM 3D run 29134419389   all targets PASS
```

This is a real GPT-directed independent execution, separate from a local GPT container run.

## Claim ledger

- `MEASURED`: healthcare→sidecar byte provenance; Path-1 recall; Path-2 CRT recovery; DBWH
  re-projection; storage-backed bounded active state; deterministic gates and receipts.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: operator-supplied Rust results.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: successful CI runs above.
- `AUDITED_GPT_5_6_PRO`: complete cross-repository source/test/lineage audit.
- `CANON`: the combined fabric-as-neural-network architecture and Shannon-safe formulas.
- `UNVERIFIED`: one live end-to-end transaction joining trained GNNs, Path-2 Rust, Hilbra transport,
  and hardware-enforced single-use shares.
