---
id: cpp-str-parse-numbers
lang: cpp
prefix: str
title: Parse numbers from text with from_chars, not atoi
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [from_chars, atoi, parsing, conversion]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::from_chars]
related: [cpp-num-to-chars, cpp-str-npos-check]
sources:
  - title: cppreference - std::from_chars
    url: https://en.cppreference.com/w/cpp/utility/from_chars
  - title: cppreference - std::to_chars
    url: https://en.cppreference.com/w/cpp/utility/to_chars
---
> from_chars reports failure and its end pointer; atoi returns 0 for garbage.

## Why

`std::from_chars` analyzes a character range and stores the parsed value only on success: it returns a result whose `ec` distinguishes `invalid_argument` from `result_out_of_range`, and whose `ptr` marks the first character not matching the pattern. Comparing that pointer with the end of the input requires the whole string to be a number, which is what rejects trailing garbage; `atoi` has no error channel at all and maps garbage to zero. The parser is locale-independent, non-allocating, and non-throwing.

## Bad

```cpp
#include <cstdlib>
#include <string>

int parse_level(const std::string& text) {
    return std::atoi(text.c_str()); // no error reporting
}

int main() {
    return parse_level("42junk") == 42 ? 0 : 1; // silently accepted
}
```

## Good

```cpp
#include <charconv>
#include <stdexcept>
#include <string>
#include <system_error>

int parse_level(const std::string& text) {
    int value = 0;
    const auto result = std::from_chars(text.data(), text.data() + text.size(), value);
    if (result.ec != std::errc{} || result.ptr != text.data() + text.size())
        throw std::invalid_argument("not a full number");
    return value;
}

int main() {
    return parse_level("42") == 42 ? 0 : 1;
}
```

## See Also

- [cpp-num-to-chars](num-to-chars.md) - the formatting direction of the same facility
- [cpp-str-npos-check](str-npos-check.md) - the other "did it work" check on text
