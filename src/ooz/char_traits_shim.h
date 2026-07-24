// ooz's compr_multiarray.cpp uses std::basic_string<uint8>, which requires
// std::char_traits<unsigned char>. libc++ 18+ removed the base template, so
// provide the specialization ourselves (force-included via -include).
#pragma once
#ifdef __cplusplus
#include <string>
#include <cstring>

namespace std {
template <> struct char_traits<unsigned char> {
  using char_type = unsigned char;
  using int_type = int;
  using off_type = streamoff;
  using pos_type = streampos;
  using state_type = mbstate_t;

  static void assign(char_type &a, const char_type &b) noexcept { a = b; }
  static bool eq(char_type a, char_type b) noexcept { return a == b; }
  static bool lt(char_type a, char_type b) noexcept { return a < b; }
  static int compare(const char_type *a, const char_type *b, size_t n) {
    return n ? memcmp(a, b, n) : 0;
  }
  static size_t length(const char_type *s) {
    return strlen(reinterpret_cast<const char *>(s));
  }
  static const char_type *find(const char_type *s, size_t n,
                               const char_type &c) {
    return static_cast<const char_type *>(memchr(s, c, n));
  }
  static char_type *move(char_type *d, const char_type *s, size_t n) {
    return static_cast<char_type *>(memmove(d, s, n));
  }
  static char_type *copy(char_type *d, const char_type *s, size_t n) {
    return static_cast<char_type *>(memcpy(d, s, n));
  }
  static char_type *assign(char_type *d, size_t n, char_type c) {
    return static_cast<char_type *>(memset(d, c, n));
  }
  static int_type not_eof(int_type c) noexcept {
    return eq_int_type(c, eof()) ? 0 : c;
  }
  static char_type to_char_type(int_type c) noexcept {
    return static_cast<char_type>(c);
  }
  static int_type to_int_type(char_type c) noexcept {
    return static_cast<int_type>(c);
  }
  static bool eq_int_type(int_type a, int_type b) noexcept { return a == b; }
  static int_type eof() noexcept { return -1; }
};
} // namespace std
#endif
