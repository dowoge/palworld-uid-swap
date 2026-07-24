// codec-node.mjs — Node.js codec implementation for palsav.js.
//
// Provides the four functions palsav.js needs:
//   deflate(u8)            -> Uint8Array   (zlib, via node:zlib)
//   inflate(u8)            -> Uint8Array   (zlib)
//   oozDecompress(u8,rawLen) -> Uint8Array (Oodle/Kraken, via ooz.wasm)
//   oozCompress(u8)        -> Uint8Array   (Oodle/Kraken)
//
// The Oodle paths instantiate src/ooz/ooz.wasm lazily; if that file is missing
// they throw only when actually called (the zlib paths keep working).

import { deflateSync, inflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function deflate(u8) {
  return new Uint8Array(deflateSync(u8));
}
export function inflate(u8) {
  return new Uint8Array(inflateSync(u8));
}

const WASM_PATH = fileURLToPath(new URL('./ooz/ooz.wasm', import.meta.url));
const OODLE_KRAKEN = 8;
const OODLE_LEVEL_NORMAL = 4;

let _instance = null;

async function ensureWasm() {
  if (_instance) return _instance;
  let bytes;
  try {
    bytes = await readFile(WASM_PATH);
  } catch (e) {
    throw new Error(
      `ooz.wasm not found at ${WASM_PATH} — build it first (see tools/build-ooz.sh). ` +
      `Original error: ${e && e.message ? e.message : e}`,
    );
  }
  // The module imports WASI functions; provide inert stubs that return 0.
  const wasiStub = new Proxy({}, { get: () => () => 0 });
  const importObject = { wasi_snapshot_preview1: wasiStub, env: {} };
  const { instance } = await WebAssembly.instantiate(bytes, importObject);
  if (typeof instance.exports._initialize === 'function') instance.exports._initialize();
  _instance = instance;
  return _instance;
}

/**
 * @param {Uint8Array} src   compressed bytes
 * @param {number} rawLen    expected decompressed length
 * @returns {Promise<Uint8Array>}
 */
export async function oozDecompress(src, rawLen) {
  const inst = await ensureWasm();
  const ex = inst.exports;
  const dstCap = rawLen + 64; // safety padding, matches palooz bindings
  const srcPtr = ex.malloc(src.length);
  const dstPtr = ex.malloc(dstCap);
  try {
    new Uint8Array(ex.memory.buffer).set(src, srcPtr);
    const n = ex.ooz_decompress(srcPtr, src.length, dstPtr, rawLen);
    if (n !== rawLen) {
      throw new Error(`ooz_decompress returned ${n}, expected ${rawLen}`);
    }
    // copy out of wasm memory (fetch buffer fresh in case it grew)
    return new Uint8Array(ex.memory.buffer.slice(dstPtr, dstPtr + rawLen));
  } finally {
    ex.free(srcPtr);
    ex.free(dstPtr);
  }
}

/**
 * @param {Uint8Array} src   raw bytes
 * @returns {Promise<Uint8Array>}
 */
export async function oozCompress(src) {
  const inst = await ensureWasm();
  const ex = inst.exports;
  const dstCap = src.length + 65536;
  const srcPtr = ex.malloc(src.length);
  const dstPtr = ex.malloc(dstCap);
  try {
    new Uint8Array(ex.memory.buffer).set(src, srcPtr);
    const n = ex.ooz_compress(OODLE_KRAKEN, OODLE_LEVEL_NORMAL, srcPtr, src.length, dstPtr);
    if (n <= 0) throw new Error(`ooz_compress failed (returned ${n})`);
    return new Uint8Array(ex.memory.buffer.slice(dstPtr, dstPtr + n));
  } finally {
    ex.free(srcPtr);
    ex.free(dstPtr);
  }
}

export default { deflate, inflate, oozDecompress, oozCompress };
