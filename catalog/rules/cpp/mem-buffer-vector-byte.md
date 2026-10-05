---
id: cpp-mem-buffer-vector-byte
lang: cpp
prefix: mem
title: Use std::vector<std::byte> for raw byte buffers instead of smart pointers to arrays
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [buffer, bytes, vector, byte]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::byte, std::vector]
related: [cpp-mem-no-smartptr-subscript, cpp-type-span]
sources:
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
---
> Hold raw memory in a byte vector so the size travels with the bytes.

## Why

A buffer allocated as `unique_ptr<unsigned char[]>` carries no length; every function it is passed to needs a separate size argument that can drift from the allocation. `std::vector<std::byte>` is contiguous, owns its storage, and exposes `size()` and `data()` together, so the byte count is always the real one. `std::byte` also states that the storage is untyped memory rather than characters.

## Bad

```cpp
#include <cstddef>
#include <memory>

void process(const unsigned char* data, std::size_t size);

int main() {
    std::unique_ptr<unsigned char[]> buffer(new unsigned char[256]); // size kept separately
    process(buffer.get(), 256);
}
```

## Good

```cpp
#include <cstddef>
#include <vector>

void process(const std::byte* data, std::size_t size);

int main() {
    std::vector<std::byte> buffer(256); // bytes and their size together
    process(buffer.data(), buffer.size());
}
```

## See Also

- [cpp-mem-no-smartptr-subscript](mem-no-smartptr-subscript.md) - pointers that lack a size
- [cpp-type-span](type-span.md) - passing the buffer on without losing its length
