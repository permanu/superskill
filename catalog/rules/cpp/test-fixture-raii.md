---
id: cpp-test-fixture-raii
lang: cpp
prefix: test
title: Express per-test setup and cleanup with an RAII fixture object
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fixture, setup, teardown, raii]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: []
related: [cpp-test-isolation, cpp-raii-wrap-resources]
sources:
  - title: GoogleTest Primer
    url: https://google.github.io/googletest/primer.html
---
> Put shared per-test setup in a fixture constructor and cleanup in its destructor.

## Why

Copying setup and cleanup into every test duplicates code and creates paths where a throwing statement skips the cleanup. A fixture object constructed at the top of the test runs setup once per test, and its destructor runs on every exit path, including exceptions. The framework creates a fresh fixture per test, so the isolation guarantee holds while the boilerplate stays in one place.

## Bad

```cpp
struct Database {
    void open();
    void close();
    void insert(int);
    void remove(int);
};

void test_insert() {
    Database db;
    db.open();
    db.insert(1); // if this throws, close() never runs
    db.close();
}

void test_remove() {
    Database db;
    db.open(); // setup and cleanup duplicated in every test
    db.remove(1);
    db.close();
}
```

## Good

```cpp
struct Database {
    void open();
    void close();
    void insert(int);
    void remove(int);
};

class DatabaseFixture {
public:
    DatabaseFixture() { db.open(); }
    ~DatabaseFixture() { db.close(); }
    Database& get() { return db; }
private:
    Database db;
};

void test_insert() {
    DatabaseFixture fixture; // setup here, cleanup on scope exit
    fixture.get().insert(1);
}

void test_remove() {
    DatabaseFixture fixture;
    fixture.get().remove(1);
}
```

## See Also

- [cpp-test-isolation](test-isolation.md) - why the fixture must be fresh per test
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - the general RAII rule this applies to tests
