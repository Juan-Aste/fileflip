// Runs once when the module starts: a UTF-8 locale makes libarchive convert
// entry names (UTF-16 in 7z, OEM/Unicode in RAR 4) to UTF-8 instead of
// replacing every non-ASCII letter, which is what the default "C" locale does.
#include <locale.h>

__attribute__((constructor)) static void fileflect_utf8_locale(void) {
  setlocale(LC_ALL, "C.UTF-8");
}
