---
id: cpp-io-read-whole-file
lang: cpp
prefix: io
title: Read a whole file with istreambuf_iterator, not a hand-rolled loop
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [read, file, iterator, streambuf]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::istreambuf_iterator]
related: [cpp-io-check-state, cpp-io-raii-streams]
sources:
  - title: cppreference - std::istreambuf_iterator
    url: https://en.cppreference.com/w/cpp/iterator/istreambuf_iterator
  - title: cppreference - std::basic_fstream
    url: https://en.cppreference.com/w/cpp/io/basic_fstream
---
> A begin/end iterator pair reads to end-of-stream in one expression.

## Why

`std::istreambuf_iterator` reads successive characters from the stream buffer, and the default-constructed iterator is the end-of-stream sentinel; a string constructed from the pair holds the whole file. The manual alternative re-implements chunk sizing, appending, and handle cleanup, and every one of those steps is a place to get the size wrong or forget the close. The iterator form is one expression, grows the destination to fit, and leaves state checking to the stream, which the caller can test afterwards.

## Bad

```cpp
#include <cstdio>
#include <string>

std::string read_all(const char* path) {
    std::FILE* file = std::fopen(path, "rb");
    std::string contents;
    char chunk[64];
    std::size_t n;
    while (file != nullptr && (n = std::fread(chunk, 1, sizeof chunk, file)) > 0)
        contents.append(chunk, n);
    if (file != nullptr)
        std::fclose(file);
    return contents;
}

int main() {
    return read_all("data.bin").empty() ? 1 : 0;
}
```

## Good

```cpp
#include <fstream>
#include <iterator>
#include <string>

std::string read_all(const char* path) {
    std::ifstream file(path, std::ios::binary);
    return std::string{std::istreambuf_iterator<char>(file),
                       std::istreambuf_iterator<char>()};
}

int main() {
    return read_all("data.bin").empty() ? 1 : 0;
}
```

## See Also

- [cpp-io-check-state](io-check-state.md) - checking the stream after the read
- [cpp-io-raii-streams](io-raii-streams.md) - the stream that owns the file
