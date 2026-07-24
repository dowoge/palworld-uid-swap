// test/compare.mjs — ground-truth verification for the palsav.js read/patch path.
//
// For each of three PlM saves: decompress the original, findGuidSlots, patch
// the player-UID mapping in place, then decompress the Python-produced expected
// .sav and byte-compare the two GVAS buffers. Byte equality proves the walker
// located the exact same GUID set the Python JSON string-replace touched.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findGuidSlots, patchGuids, decompressSav } from '../src/palsav.js';
import * as codec from '../src/codec-node.mjs';

// Machine-specific fixtures: ORIG_DIR holds pre-swap saves, EXP_DIR the same
// saves swapped by the Python palsav pipeline (the ground truth).
const ORIG_DIR =
  process.env.ORIG_DIR ??
  '/tmp/claude-1000/-home-tommy--local-share-Steam-steamapps-compatdata-3885798137-pfx-drive-c-users-steamuser-AppData-Local-Pal-Saved-SaveGames-76561198361560898-A5545123445E800C5044F98D746F767C/f2b387f0-89cc-4083-80a4-1dab61a95904/scratchpad/manual-backup';
const EXP_DIR =
  process.env.EXP_DIR ??
  '/tmp/claude-1000/-home-tommy--local-share-Steam-steamapps-compatdata-3885798137-pfx-drive-c-users-steamuser-AppData-Local-Pal-Saved-SaveGames-76561198361560898-A5545123445E800C5044F98D746F767C/f2b387f0-89cc-4083-80a4-1dab61a95904/scratchpad/groundtruth';

const WASM_PATH = fileURLToPath(new URL('../src/ooz/ooz.wasm', import.meta.url));

const PAIRS = [
  { name: 'Level.sav', orig: `${ORIG_DIR}/Level.sav`, exp: `${EXP_DIR}/Level.sav` },
  {
    name: 'Players/00000000000000000000000000000001.sav',
    orig: `${ORIG_DIR}/Players/00000000000000000000000000000001.sav`,
    exp: `${EXP_DIR}/Players/405EE8D4000000000000000000000000.sav`,
  },
  {
    name: 'Players/ED07650A000000000000000000000000.sav',
    orig: `${ORIG_DIR}/Players/ED07650A000000000000000000000000.sav`,
    exp: `${EXP_DIR}/Players/00000000000000000000000000000001.sav`,
  },
];

const MAPPING = new Map([
  ['00000000-0000-0000-0000-000000000001', '405ee8d4-0000-0000-0000-000000000000'],
  ['ed07650a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001'],
]);

function hex(u8, off, len) {
  const parts = [];
  for (let i = off; i < Math.min(off + len, u8.length); i++) parts.push(u8[i].toString(16).padStart(2, '0'));
  return parts.join(' ');
}

async function main() {
  if (!existsSync(WASM_PATH)) {
    console.log('SKIP: ooz.wasm not present — cannot decompress PlM saves yet.');
    console.log(`      Expected at ${WASM_PATH}`);
    process.exit(0);
  }

  let anyFail = false;
  for (const pair of PAIRS) {
    console.log(`\n=== ${pair.name} ===`);
    const origSav = new Uint8Array(await readFile(pair.orig));
    const expSav = new Uint8Array(await readFile(pair.exp));

    const { gvas: origGvas } = await decompressSav(origSav, codec);
    const { gvas: expGvas } = await decompressSav(expSav, codec);

    const { slots, warnings } = findGuidSlots(origGvas);
    const { patched } = patchGuids(origGvas, slots, MAPPING);

    console.log(`  slots: ${slots.length}`);
    console.log(`  patched: ${JSON.stringify(patched)}`);
    if (warnings.length) {
      console.log(`  warnings (${warnings.length}):`);
      for (const w of warnings) console.log(`    - ${w}`);
    } else {
      console.log('  warnings: none');
    }

    if (origGvas.length !== expGvas.length) {
      console.log(`  MISMATCH: length ${origGvas.length} != expected ${expGvas.length}`);
      anyFail = true;
      continue;
    }
    const diffs = [];
    for (let i = 0; i < origGvas.length && diffs.length < 10; i++) {
      if (origGvas[i] !== expGvas[i]) diffs.push(i);
    }
    if (diffs.length === 0) {
      console.log('  IDENTICAL');
    } else {
      anyFail = true;
      console.log(`  MISMATCH at ${diffs.length}+ offsets:`);
      for (const off of diffs) {
        const ctx = Math.max(0, off - 4);
        console.log(`    @${off}: mine   ${hex(origGvas, ctx, 16)}`);
        console.log(`           theirs ${hex(expGvas, ctx, 16)}`);
      }
    }
  }

  if (anyFail) {
    console.log('\nRESULT: MISMATCH');
    process.exit(1);
  }
  console.log('\nRESULT: ALL IDENTICAL');
}

main().catch((e) => { console.error(e); process.exit(1); });
