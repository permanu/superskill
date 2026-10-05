---
id: cpp-doc-crisp
lang: cpp
prefix: doc
title: Keep comments crisp; a short line beats a paragraph
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, brevity, readability]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-doc-no-restate, cpp-doc-why]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Compress the operational point; move the full story to the design document.

## Why

NL.3 asks that comments be crisp: short and to the point. A paragraph around a single decision buries the instruction a maintainer needs, and the length suggests more authority than the comment has. One line that names the constraint, plus a pointer to the longer discussion where it belongs, gives the next reader exactly what the code site can act on.

## Bad

```cpp
#include <vector>

// This buffer is reused between requests. We keep it around because allocating
// it per request showed up in profiles. The size was chosen by doubling the
// largest payload seen in production, and it should not be shrunk without new
// measurements that show the change is safe.
std::vector<char> buffer;

int main() {
    return buffer.capacity() > 0 ? 0 : 1;
}
```

## Good

```cpp
#include <vector>

// Reused across requests; see docs/perf.md before changing the size.
std::vector<char> buffer;

int main() {
    return buffer.capacity() > 0 ? 0 : 1;
}
```

## See Also

- [cpp-doc-no-restate](doc-no-restate.md) - cutting text the code already covers
- [cpp-doc-why](doc-why.md) - the one thing the short line must carry
