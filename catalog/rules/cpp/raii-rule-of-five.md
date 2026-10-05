---
id: cpp-raii-rule-of-five
lang: cpp
prefix: raii
title: Declare, default, or delete all five special member functions together
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [rule-of-five, copy, move, destructor, deleted]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [operator=, std::exchange]
related: [cpp-raii-rule-of-zero, cpp-raii-move-valid-source]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - The rule of three/five/zero
    url: https://en.cppreference.com/w/cpp/language/rule_of_three
---
> If a class declares one destructor, copy, or move operation, declare or delete all five deliberately.

## Why

Declaring a destructor suppresses the implicit move operations, so moves silently fall back to copies. Declaring one copy operation while omitting the other leaves the implicit version, and any operation that copies a non-class handle duplicates ownership. Deciding all five together forces the class's ownership policy to be explicit: delete copies for unique ownership, and write or default the moves.

## Bad

```cpp
#include <cstdio>

class File {
public:
    explicit File(const char* path) : handle_(std::fopen(path, "r")) {}
    ~File() { std::fclose(handle_); }
    // implicit copy duplicates handle_: two owners of one FILE*
private:
    std::FILE* handle_;
};
```

## Good

```cpp
#include <cstdio>
#include <utility>

class File {
public:
    explicit File(const char* path) : handle_(std::fopen(path, "r")) {}
    ~File() { if (handle_) std::fclose(handle_); }

    File(const File&) = delete; // unique ownership
    File& operator=(const File&) = delete;
    File(File&& other) noexcept : handle_(std::exchange(other.handle_, nullptr)) {}
    File& operator=(File&& other) noexcept {
        if (this != &other) {
            if (handle_) std::fclose(handle_);
            handle_ = std::exchange(other.handle_, nullptr);
        }
        return *this;
    }

private:
    std::FILE* handle_;
};
```

## See Also

- [cpp-raii-rule-of-zero](raii-rule-of-zero.md) - the default choice that avoids all of this
- [cpp-raii-move-valid-source](raii-move-valid-source.md) - what the move operations must leave behind
