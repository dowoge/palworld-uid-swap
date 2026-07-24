#!/usr/bin/env bash
# Build src/ooz/ooz.wasm from the ooz sources vendored in PalworldSaveTools
# (https://github.com/deafdudecomputers/PalworldSaveTools, src/palsav/palooz).
#
# Usage:
#   OOZ_SRC=/path/to/PalworldSaveTools/src/palsav/palooz/ooz/dep/ooz \
#   WASI_SDK=/path/to/wasi-sdk \
#   ./tools/build-ooz.sh
set -euo pipefail

OOZ_SRC="${OOZ_SRC:?set OOZ_SRC to the ooz source dir (dep/ooz)}"
WASI_SDK="${WASI_SDK:?set WASI_SDK to a wasi-sdk install}"
OUT_DIR="$(cd "$(dirname "$0")/../src/ooz" && pwd)"

SOURCES=(
  bitknit.cpp kraken.cpp lzna.cpp compress.cpp compr_kraken.cpp
  compr_lzoffset.cpp compr_entropy.cpp compr_match_finder.cpp
  compr_multiarray.cpp compr_tans.cpp
)
SRCS=("$OUT_DIR/ooz_wasm.cpp")
for s in "${SOURCES[@]}"; do SRCS+=("$OOZ_SRC/$s"); done

"$WASI_SDK/bin/clang++" \
  --target=wasm32-wasi \
  -O3 -fno-exceptions -fno-rtti -ffast-math -fno-strict-aliasing \
  -DOOZ_BUILD_DLL=1 \
  -include "$OUT_DIR/char_traits_shim.h" \
  -I "$OOZ_SRC/simde" \
  -mexec-model=reactor \
  -Wl,--export=malloc -Wl,--export=free \
  -o "$OUT_DIR/ooz.wasm" \
  "${SRCS[@]}"

ls -la "$OUT_DIR/ooz.wasm"
