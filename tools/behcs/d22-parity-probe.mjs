#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { D22_VERBS, runD22Verb } from './d22-verb-adapter.mjs';

// STEP|166 exit=byte-match: every row below must be byte-identical on every
// machine that regenerates it, so nothing host-, path-, or time-dependent
// may enter the rows. The sealed baseline in docs/ is the cross-machine
// compare target; the unit test regenerates and byte-compares on each run.
const PROBE_CASES = Object.freeze([
  { id: '01', verb: 'tuple_to_english', input: { from: 'liris', to: 'acer', verb: 'test.ping', input_a: '1' } },
  { id: '02', verb: 'tuple_to_english', input: '@packet from=acer verb=parity x=1' },
  { id: '03', verb: 'english_to_tuple', input: '@packet from=parity verb=ok' },
  { id: '04', verb: 'english_to_tuple', input: 'translate this naturally' },
  { id: '05', verb: 'ix_to_tuple', input: 'IX-459 beast discovery' },
  { id: '06', verb: 'hilbert_to_human', input: 'PID-H9E2A-A07-W104-P00-N00000' },
  { id: '07', verb: 'crlt_merge', input: [{ from: 'liris', verb: 'one' }, '@packet to=acer input_a=2'] },
  { id: '08', verb: 'auto_transition_all_languages', input: '@packet verb=test' },
  { id: '09', verb: 'namespace_walk', input: null },
]);

function sha16(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function emitParityRows() {
  const verbsCovered = new Set(PROBE_CASES.map((c) => c.verb));
  const rows = [
    `D22PARITYHDR|step=166|verbs_covered=${verbsCovered.size}of${D22_VERBS.length}|cases=${PROBE_CASES.length}|rule=rows-byte-identical-on-every-machine|json=0`,
  ];
  const outputs = [];
  for (const probe of PROBE_CASES) {
    const out = runD22Verb(probe.verb, probe.input);
    const serialized = JSON.stringify(out);
    outputs.push(serialized);
    rows.push(
      `D22PARITY|case=${probe.id}|verb=${probe.verb}|input_sha16=${sha16(probe.input)}|output_sha16=${sha16(serialized)}|state=${out.state}|json=0`,
    );
  }
  rows.push(
    `D22PARITYFTR|cases=${PROBE_CASES.length}|bundle_sha16=${sha16(outputs.join('\n'))}|exit=byte-match-when-regenerated-file-equals-sealed-baseline|json=0`,
  );
  return rows;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  process.stdout.write(emitParityRows().join('\n') + '\n');
}
