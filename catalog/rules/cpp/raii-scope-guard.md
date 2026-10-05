---
id: cpp-raii-scope-guard
lang: cpp
prefix: raii
title: Use a scope guard for cleanup that is not a resource instead of restoring state on every exit path
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [scope-guard, finally, cleanup, restore]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::exchange]
related: [cpp-raii-wrap-resources, cpp-err-raii-not-catch]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - RAII
    url: https://en.cppreference.com/w/cpp/language/raii
---
> Restore borrowed state through a guard object that runs on scope exit, not on each return path.

## Why

Some scope changes are not owned resources: a temporarily raised log level, an entered diagnostic mode, a global flag saved and restored. Writing the restore at each exit repeats the same statement and the missed path leaves the process in the wrong state. A small guard object performs the restore in its destructor, covering normal exit, early return, and exceptions with one line at the top of the scope.

## Bad

```cpp
struct Logger {
    static bool verbose;
};
bool Logger::verbose = false;

void trace(int value) {
    const bool previous = Logger::verbose;
    Logger::verbose = true;
    if (value < 0) {
        Logger::verbose = previous; // restore duplicated on each path
        return;
    }
    Logger::verbose = previous;
}
```

## Good

```cpp
struct Logger {
    static bool verbose;
};
bool Logger::verbose = false;

class VerboseGuard {
public:
    explicit VerboseGuard(bool& flag) : flag_(flag), previous_(flag) { flag = true; }
    ~VerboseGuard() { flag_ = previous_; }
    VerboseGuard(const VerboseGuard&) = delete;
    VerboseGuard& operator=(const VerboseGuard&) = delete;
private:
    bool& flag_;
    bool previous_;
};

void trace(int value) {
    const VerboseGuard guard(Logger::verbose);
    if (value < 0)
        return; // flag restored by the guard
}
```

## See Also

- [cpp-raii-wrap-resources](raii-wrap-resources.md) - the same pattern for owned resources
- [cpp-err-raii-not-catch](err-raii-not-catch.md) - cleanup belongs in destructors, not catch blocks
