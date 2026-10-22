// The two helpers libarchive-wasm's JavaScript wrapper expects on top of
// libarchive's API (same names and contracts as its own build).
#include <stddef.h>
#include "archive.h"
#include "archive_entry.h"

// A reader over `size` bytes at `data` with every filter and format enabled;
// NULL if the data can't be opened.
struct archive *archive_read_new_memory(const void *data, size_t size, const char *passphrase) {
  struct archive *a = archive_read_new();
  if (a == NULL) return NULL;
  if (archive_read_support_filter_all(a) != ARCHIVE_OK || archive_read_support_format_all(a) != ARCHIVE_OK ||
      (passphrase != NULL && archive_read_add_passphrase(a, passphrase) != ARCHIVE_OK) ||
      archive_read_open_memory(a, data, size) != ARCHIVE_OK) {
    archive_read_free(a);
    return NULL;
  }
  return a;
}

// The next entry's header, or NULL at the end of the archive or on an error
// (then archive_error_string tells which).
struct archive_entry *archive_read_next_entry(struct archive *a) {
  struct archive_entry *entry;
  int r = archive_read_next_header(a, &entry);
  return r == ARCHIVE_OK || r == ARCHIVE_WARN ? entry : NULL;
}
