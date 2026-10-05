---
id: cpp-tmpl-tag-dispatch
lang: cpp
prefix: tmpl
title: Select implementations with tag dispatch
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tag-dispatch, iterator-category, overloads]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-tmpl-specialization, cpp-tmpl-forwarding-greedy]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - SFINAE
    url: https://en.cppreference.com/w/cpp/language/sfinae
---
> A tag parameter moves the choice from a runtime test to overload resolution.

## Why

T.65 asks to use tag dispatch to provide alternative implementations of a function. The SFINAE reference lists tag dispatch among the alternatives usually preferred over SFINAE. The technique passes an empty tag type — an iterator category, a trait — as an extra argument, so each implementation is an ordinary overload selected by overload resolution at compile time; a runtime branch on a type property instead forces every branch to compile for every type and leaves the dead one in the binary.

## Bad

```cpp
#include <iterator>
#include <type_traits>
#include <vector>

template <class It>
void advance_to(It& it, int n) {
    if (std::is_same_v<typename std::iterator_traits<It>::iterator_category,
                       std::random_access_iterator_tag>)
        it += n; // both branches must compile for every iterator
    else
        while (n-- > 0)
            ++it;
}

int main() {
    std::vector<int> values{1, 2};
    auto it = values.begin();
    advance_to(it, 1);
    return 0;
}
```

## Good

```cpp
#include <iterator>
#include <vector>

template <class It>
void advance_impl(It& it, int n, std::random_access_iterator_tag) {
    it += n; // chosen at compile time
}

template <class It>
void advance_impl(It& it, int n, std::input_iterator_tag) {
    while (n-- > 0)
        ++it;
}

template <class It>
void advance_to(It& it, int n) {
    advance_impl(it, n, typename std::iterator_traits<It>::iterator_category{});
}

int main() {
    std::vector<int> values{1, 2};
    auto it = values.begin();
    advance_to(it, 1);
    return 0;
}
```

## See Also

- [cpp-tmpl-specialization](tmpl-specialization.md) - the class-template form of selection
- [cpp-tmpl-forwarding-greedy](tmpl-forwarding-greedy.md) - keeping overload sets predictable
