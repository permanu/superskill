---
id: cpp-str-quoted
lang: cpp
prefix: str
title: Round-trip strings with spaces through std::quoted
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [quoted, escaping, serialization, stream]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::quoted]
related: [cpp-str-getline, cpp-io-check-state]
sources:
  - title: cppreference - std::quoted
    url: https://en.cppreference.com/w/cpp/io/manip/quoted
  - title: cppreference - std::getline
    url: https://en.cppreference.com/w/cpp/string/basic_string/getline
---
> Delimit and escape on the way out, unescape on the way in; the value survives intact.

## Why

Writing a string with spaces into a stream without delimiters loses its boundaries: the next extraction stops at the first space. `std::quoted` inserts the value with a delimiter around it and escapes any occurrence of the delimiter or escape character, and on extraction it turns off whitespace skipping, unescapes, and stops at the unescaped delimiter — the pattern the reference documents for CSV and XML. Both directions are one manipulator, so the read side cannot disagree with the write side.

## Bad

```cpp
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::stringstream stream;
    stream << "hello world"; // spaces break the round trip
    std::string word;
    stream >> word; // reads only "hello"
    return word == "hello" ? 0 : 1;
}
```

## Good

```cpp
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::stringstream stream;
    stream << std::quoted("hello world"); // quoted and escaped
    std::string text;
    stream >> std::quoted(text); // reads the whole value back
    return text == "hello world" ? 0 : 1;
}
```

## See Also

- [cpp-str-getline](str-getline.md) - the line-oriented alternative for structured text
- [cpp-io-check-state](io-check-state.md) - checking the extraction that follows
