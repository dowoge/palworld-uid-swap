// codec-browser.js — browser codec implementation for palsav.js.
//
// Same interface as codec-node.mjs, but built on web-platform primitives so it
// runs with zero dependencies in a static page:
//   deflate(u8)              -> Uint8Array   (zlib, via CompressionStream)
//   inflate(u8)              -> Uint8Array   (zlib, via DecompressionStream)
//   oozDecompress(u8,rawLen) -> Uint8Array   (Oodle/Kraken, via ooz.wasm)
//   oozCompress(u8)          -> Uint8Array   (Oodle/Kraken)
//
// Note on 'deflate': the CompressionStream 'deflate' format is the zlib-wrapped
// stream (RFC 1950), which is exactly what Palworld's PlZ/CNK containers use and
// what node:zlib deflateSync produces — so this is byte-compatible with the Node
// codec, not the raw DEFLATE ('deflate-raw') variant.

// ---------------------------------------------------------------------------
// zlib via Compression/DecompressionStream
// ---------------------------------------------------------------------------

async function pipe(u8, stream) {
  const writer = stream.writable.getWriter();
  // Copy the (possibly subarray) view into a standalone buffer so the stream
  // sees exactly these bytes and nothing else in the backing ArrayBuffer.
  writer.write(u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength ? u8 : u8.slice());
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buf);
}

export function deflate(u8) {
  return pipe(u8, new CompressionStream('deflate'));
}

export function inflate(u8) {
  return pipe(u8, new DecompressionStream('deflate'));
}

// ---------------------------------------------------------------------------
// Oodle/Kraken via ooz.wasm (lazy, cached)
// ---------------------------------------------------------------------------
// Resolve the wasm relative to THIS module (src/codec-browser.js), so it works
// under any GitHub Pages subpath. new URL(...) is pure string work — no I/O — so
// importing this module never touches the network or filesystem.
const WASM_URL = new URL('ooz/ooz.wasm', import.meta.url);
const OODLE_KRAKEN = 8;
const OODLE_LEVEL_NORMAL = 4;

let _instancePromise = null;

async function loadWasmBytes() {
  try {
    const resp = await fetch(WASM_URL);
    if (!resp.ok) throw new Error(`fetch ${WASM_URL} -> HTTP ${resp.status}`);
    return new Uint8Array(await resp.arrayBuffer());
  } catch (e) {
    // Node (used by the smoke test / CI) has no fetch(file://) support — fall
    // back to reading from disk. This branch never runs in a browser.
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const { readFile } = await import('node:fs/promises');
      const { fileURLToPath } = await import('node:url');
      return new Uint8Array(await readFile(fileURLToPath(WASM_URL)));
    }
    throw new Error(
      `Could not load ooz.wasm from ${WASM_URL}. ` +
      `Original error: ${e && e.message ? e.message : e}`,
    );
  }
}

function ensureWasm() {
  if (_instancePromise) return _instancePromise;
  _instancePromise = (async () => {
    const bytes = await loadWasmBytes();
    // The module imports WASI functions; provide inert stubs that return 0.
    const wasiStub = new Proxy({}, { get: () => () => 0 });
    const importObject = { wasi_snapshot_preview1: wasiStub, env: {} };
    const { instance } = await WebAssembly.instantiate(bytes, importObject);
    if (typeof instance.exports._initialize === 'function') instance.exports._initialize();
    return instance;
  })().catch((e) => { _instancePromise = null; throw e; });
  return _instancePromise;
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
