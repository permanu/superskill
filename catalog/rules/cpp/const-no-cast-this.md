---
id: cpp-const-no-cast-this
lang: cpp
prefix: const
title: Never cast this to non-const inside a const member function
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const_cast, this, member-functions, undefined]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [const_cast]
related: [cpp-const-no-cast-away, cpp-const-member-functions]
sources:
  - title: cppreference - const_cast conversion
    url: https://en.cppreference.com/w/cpp/language/const_cast
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> The cast is sound only when the object is not const — which the signature denies.

## Why

The const_cast reference shows the pattern and its boundary in one line: modifying through `const_cast<type*>(this)` is "OK as long as the type object isn't const", and the note states that modifying a const object through a non-const access path is undefined behavior. A const member function promises callers it may be invoked on a const object, so the cast's precondition is exactly what the signature refuses to guarantee. The honest shape is a non-const function for the mutation and a const function for the read.

## Bad

```cpp
class Counter {
public:
    int next() const { // mutates through const_cast
        return ++const_cast<Counter*>(this)->value_;
    }
private:
    int value_ = 0;
};

int main() {
    Counter counter;
    return counter.next() == 1 ? 0 : 1; // undefined if counter were const
}
```

## Good

```cpp
class Counter {
public:
    int next() { // non-const: mutation is honest
        return ++value_;
    }
    int value() const { return value_; } // read-only access
private:
    int value_ = 0;
};

int main() {
    Counter counter;
    return counter.next() == 1 ? 0 : 1;
}
```

## See Also

- [cpp-const-no-cast-away](const-no-cast-away.md) - the general rule this specializes
- [cpp-const-member-functions](const-member-functions.md) - marking the readers const instead
