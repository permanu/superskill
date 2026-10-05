---
id: cpp-io-binary-mode
lang: cpp
prefix: io
title: Open binary mode for data that is not text
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [binary, text-mode, fstream, bytes]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::ios::binary]
related: [cpp-io-read-whole-file, cpp-mem-buffer-vector-byte]
sources:
  - title: cppreference - std::basic_fstream
    url: https://en.cppreference.com/w/cpp/io/basic_fstream
  - title: cppreference - std::ios_base::openmode
    url: https://en.cppreference.com/w/cpp/io/ios_base/openmode
---
> Text mode may transform bytes; binary mode guarantees they are written as-is.

## Why

The `binary` open mode constant means "open in binary mode"; without it, a text-mode stream is allowed to translate between the program's bytes and the platform's text representation, which changes line endings and can treat control characters as end-of-file. For serialized structs, compressed data, images, or any buffer whose exact bytes matter, that translation corrupts the content. Binary mode also pairs with `read`/`write`, which move raw bytes rather than formatted text.

## Bad

```cpp
#include <cstddef>
#include <fstream>

void write_record(const char* path, const char* data, std::size_t size) {
    std::ofstream file(path); // text mode can transform bytes
    file.write(data, static_cast<std::streamsize>(size));
}

int main() {
    write_record("record.bin", "\x1a\x0d\x0a", 3);
}
```

## Good

```cpp
#include <cstddef>
#include <fstream>

void write_record(const char* path, const char* data, std::size_t size) {
    std::ofstream file(path, std::ios::binary); // bytes written as-is
    file.write(data, static_cast<std::streamsize>(size));
}

int main() {
    write_record("record.bin", "\x1a\x0d\x0a", 3);
}
```

## See Also

- [cpp-io-read-whole-file](io-read-whole-file.md) - reading bytes back without transformation
- [cpp-mem-buffer-vector-byte](mem-buffer-vector-byte.md) - the buffer that holds the bytes
