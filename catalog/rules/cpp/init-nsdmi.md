---
id: cpp-init-nsdmi
lang: cpp
prefix: init
title: Give members default member initializers
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default-member-initializer, members, constructors]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-init-init-not-assign, cpp-init-declare-at-use]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Non-static data members
    url: https://en.cppreference.com/w/cpp/language/data_members
---
> The member's constant default belongs on the member, not in every constructor.

## Why

C.48 asks to prefer default member initializers to member initializers in constructors for constant initializers. The data members reference defines the mechanism: a default member initializer is a brace or equals initializer in the member declaration, used when the member is omitted from a constructor's initializer list, and ignored for a constructor that does name the member. Writing the constant once, next to the declaration, keeps every constructor — including the implicit ones — consistent with it.

## Bad

```cpp
struct Config {
    int retries;
    int timeout;
    Config() : retries(3), timeout(30) {} // the same constants in every constructor
};

int main() {
    Config config;
    return config.retries == 3 && config.timeout == 30 ? 0 : 1;
}
```

## Good

```cpp
struct Config {
    int retries = 3;  // default member initializers
    int timeout = 30;
};

int main() {
    Config config;
    return config.retries == 3 && config.timeout == 30 ? 0 : 1;
}
```

## See Also

- [cpp-init-init-not-assign](init-init-not-assign.md) - constructing members that need arguments
- [cpp-init-declare-at-use](init-declare-at-use.md) - the same discipline for locals
