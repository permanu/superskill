---
id: cpp-doc-deprecated
lang: cpp
prefix: doc
title: Mark deprecated APIs with [[deprecated]] and a replacement message
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecated, migration, api]
  files: ["**/*.hpp", "**/*.h"]
  symbols: [deprecated]
related: [cpp-doc-public-api, cpp-doc-throws]
sources:
  - title: cppreference - deprecated attribute
    url: https://en.cppreference.com/w/cpp/language/attributes/deprecated
  - title: cppreference - Comments
    url: https://en.cppreference.com/w/cpp/comment
---
> The attribute reaches the compiler and the user; a comment reaches neither.

## Why

`[[deprecated]]` marks a name as allowed but discouraged, and compilers typically issue warnings on its uses; the optional string literal usually appears in those warnings and can state the rationale or name the replacement. A plain comment has no effect on any tool and is seen only by readers who open the header. Writing the migration into the attribute turns every downstream build into the notification.

## Bad

```cpp
#include <string>

// Deprecated: use canonical_host instead.
std::string normalize_host(const std::string& host);

int main() {
    return 0;
}
```

## Good

```cpp
#include <string>

[[deprecated("use canonical_host instead")]]
std::string normalize_host(const std::string& host);

int main() {
    return 0;
}
```

## See Also

- [cpp-doc-public-api](doc-public-api.md) - the rest of the declaration's documentation
- [cpp-doc-throws](doc-throws.md) - the other contract detail users need
