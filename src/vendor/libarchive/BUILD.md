# libarchive para el navegador (generado; no editar)

Generado por `scripts/libarchive/build.sh` el 2026-10-22 con Emscripten 6.0.13.

| Componente | Versión | Licencia |
|---|---|---|
| libarchive | 3.8.10 | BSD-2-Clause |
| zlib | 1.3.2 | Zlib |
| bzip2 | 1.0.8 | bzip2 (BSD-like) |
| xz / liblzma | 5.8.4 | 0BSD |

- Locale `C.UTF-8` al iniciar (`glue.c`): nombres no ASCII de 7Z y RAR 4 en UTF-8.
- Sin OpenSSL/Nettle/mbedTLS (no descifra: los cifrados se detectan y se rechazan), sin iconv, zstd, lz4, libxml2 ni expat.
- sha256: libarchive.wasm 76e2eef711e127d6582545daa32ea9ebc4e1b0d290374caaae1143d19b3eeb31
