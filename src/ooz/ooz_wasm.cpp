// Minimal WASM exports around ooz (open-source Oodle reimplementation).
// Mirrors the palooz Python bindings' use of the library.

#include <stdint.h>
#include <stddef.h>

int Kraken_Decompress(const uint8_t *src, size_t src_len, uint8_t *dst,
                      size_t dst_len);

struct CompressOptions;
struct LRMCascade;

int CompressBlock(int codec_id, uint8_t *src_in, uint8_t *dst_in, int src_size,
                  int level, const CompressOptions *compressopts,
                  uint8_t *src_window_base, LRMCascade *lrm);

extern "C" {

__attribute__((export_name("ooz_decompress")))
int ooz_decompress(const uint8_t *src, int src_len, uint8_t *dst, int dst_len) {
  // Caller must allocate dst with at least dst_len + 64 bytes of capacity,
  // matching the palooz bindings' safety padding.
  return Kraken_Decompress(src, (size_t)src_len, dst, (size_t)dst_len);
}

__attribute__((export_name("ooz_compress")))
int ooz_compress(int codec_id, int level, uint8_t *src, int src_len,
                 uint8_t *dst) {
  // Caller must allocate dst with at least src_len + 65536 bytes.
  return CompressBlock(codec_id, src, dst, src_len, level, nullptr, nullptr,
                       nullptr);
}

} // extern "C"
