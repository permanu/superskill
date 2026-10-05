---
id: cpp-type-parse-at-boundary
lang: cpp
prefix: type
title: Convert untrusted input into validated types once, at the boundary
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parse, boundary, validation, typed]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::string]
related: [cpp-type-strong-types, cpp-err-expected-for-recoverable]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Parse external text into domain types at the edge; pass validated values, not strings, inward.

## Why

Unvalidated strings travel freely and every consumer that needs structure must re-parse them, so checks scatter across the codebase and one forgotten check lets malformed data through. Converting once at the boundary produces a value whose invariant is already established; downstream code cannot forget the check because it never sees the raw form. It also fixes each validation bug in one place.

## Bad

```cpp
#include <string>

// Bad: every consumer must re-parse and re-check these strings.
void schedule(const std::string& date, const std::string& user);
void cancel(const std::string& date, const std::string& user);

int main() {
    schedule("2026-10-04", "alice");
    cancel("2026-10-04", "alice");
}
```

## Good

```cpp
#include <string>

struct Date { int year; int month; int day; };
struct User { std::string name; };

Date parse_date(const std::string& text); // validates once, at the edge
User parse_user(const std::string& text);

void schedule(const Date& date, const User& user);
void cancel(const Date& date, const User& user);

int main() {
    schedule(parse_date("2026-10-04"), parse_user("alice"));
    cancel(parse_date("2026-10-04"), parse_user("alice"));
}
```

## See Also

- [cpp-type-strong-types](type-strong-types.md) - the types the boundary produces
- [cpp-err-expected-for-recoverable](err-expected-for-recoverable.md) - reporting parse failures without exceptions
