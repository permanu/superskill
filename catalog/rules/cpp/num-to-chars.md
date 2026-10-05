---
id: cpp-num-to-chars
lang: cpp
prefix: num
title: Convert numbers to text with to_chars, not a stream or printf
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [to_chars, conversion, locale, allocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::to_chars]
related: [cpp-num-fixed-width, cpp-obs-format]
sources:
  - title: cppreference - std::to_chars
    url: https://en.cppreference.com/w/cpp/utility/to_chars
  - title: cppreference - std::string
    url: https://en.cppreference.com/w/cpp/string/basic_string
---
> to_chars is locale-independent, non-allocating, and non-throwing; it writes into your buffer.

## Why

`std::to_chars` fills a caller-provided range `[first, last)` with the digits and reports success or `value_too_large` through a `to_chars_result`; the reference notes that it is locale-independent, non-allocating, and non-throwing, which is what text-based interchange such as JSON or XML needs. A stream conversion allocates and carries stream state for one number, and the printf family consults the locale. The result is not NUL-terminated, so the length comes from the returned end pointer.

## Bad

```cpp
#include <sstream>
#include <string>

std::string format(int value) {
    std::ostringstream out;
    out << value; // allocates a stream for one number
    return out.str();
}

int main() {
    return format(42) == "42" ? 0 : 1;
}
```

## Good

```cpp
#include <array>
#include <charconv>
#include <string_view>
#include <system_error>

std::string_view format(int value, std::array<char, 16>& buffer) {
    const auto result = std::to_chars(buffer.data(), buffer.data() + buffer.size(), value);
    if (result.ec != std::errc{})
        return {};
    return std::string_view(buffer.data(), static_cast<std::size_t>(result.ptr - buffer.data()));
}

int main() {
    std::array<char, 16> buffer{};
    return format(42, buffer) == "42" ? 0 : 1;
}
```

## See Also

- [cpp-num-fixed-width](num-fixed-width.md) - the types whose values are being converted
- [cpp-obs-format](obs-format.md) - the formatting counterpart for composed messages
