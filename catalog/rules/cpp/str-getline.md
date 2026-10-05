---
id: cpp-str-getline
lang: cpp
prefix: str
title: Read lines with getline, not operator>> on a string
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [getline, operator>>, lines, whitespace]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::getline]
related: [cpp-io-check-state, cpp-io-istringstream-parse]
sources:
  - title: cppreference - std::getline
    url: https://en.cppreference.com/w/cpp/string/basic_string/getline
  - title: cppreference - std::basic_istream
    url: https://en.cppreference.com/w/cpp/io/basic_istream
---
> operator>> stops at whitespace; getline reads to the delimiter you name.

## Why

Formatted extraction for strings is whitespace-delimited, so `input >> word` stops at the first space and leaves the rest of the line in the stream. `std::getline` extracts characters until the delimiter — the newline by default — and consumes it without appending it to the string; the delimiter overload splits on any character, which covers field separators as well as lines. It sets `failbit` when nothing at all was extracted, so the return value doubles as the loop condition.

## Bad

```cpp
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::istringstream input("first line\nsecond line\n");
    std::string word;
    input >> word; // stops at the first space
    return word == "first" ? 0 : 1;
}
```

## Good

```cpp
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::istringstream input("first line\nsecond line\n");
    std::string line;
    std::getline(input, line); // reads through the newline
    return line == "first line" ? 0 : 1;
}
```

## See Also

- [cpp-io-check-state](io-check-state.md) - the failbit this function reports
- [cpp-io-istringstream-parse](io-istringstream-parse.md) - the delimiter overload in a parser
