---
id: cpp-mem-monotonic-resource
lang: cpp
prefix: mem
title: Use a monotonic buffer resource for many short-lived allocations released together
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pmr, monotonic, arena, allocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::pmr::monotonic_buffer_resource]
related: [cpp-mem-resource-outlives, cpp-perf-reserve-capacity]
sources:
  - title: cppreference - std::pmr::monotonic_buffer_resource
    url: https://en.cppreference.com/w/cpp/memory/monotonic_buffer_resource
  - title: cppreference - std::pmr::memory_resource
    url: https://en.cppreference.com/w/cpp/memory/memory_resource
---
> Build a batch of objects with a monotonic resource that frees everything at once.

## Why

When many small objects share one lifetime and are discarded together, per-object deallocation is wasted work and fragmentation. `std::pmr::monotonic_buffer_resource` allocates from increasing offsets in a buffer and releases the entire buffer only when the resource is destroyed, making each allocation nearly a pointer bump. An initial buffer on the stack removes even the upstream allocations; the trade-off is that individual deallocations do nothing and the resource is not thread-safe.

## Bad

```cpp
#include <memory>
#include <string>
#include <vector>

std::vector<std::unique_ptr<std::string>> build_labels(int count) {
    std::vector<std::unique_ptr<std::string>> labels;
    for (int i = 0; i < count; ++i)
        labels.push_back(std::make_unique<std::string>("label")); // one allocation each
    return labels;
}
```

## Good

```cpp
#include <array>
#include <cstddef>
#include <memory_resource>
#include <string>
#include <vector>

std::pmr::vector<std::pmr::string> build_labels(
        std::pmr::monotonic_buffer_resource& resource, int count) {
    std::pmr::vector<std::pmr::string> labels{&resource};
    for (int i = 0; i < count; ++i)
        labels.emplace_back("label"); // served from the buffer
    return labels;
}

int main() {
    std::array<std::byte, 4096> buffer{};
    std::pmr::monotonic_buffer_resource resource{buffer.data(), buffer.size()};
    const auto labels = build_labels(resource, 3); // resource outlives labels
    return labels.size() == 3 ? 0 : 1;
}
```

## See Also

- [cpp-mem-resource-outlives](mem-resource-outlives.md) - the lifetime contract every pmr container relies on
- [cpp-perf-reserve-capacity](perf-reserve-capacity.md) - eliminating reallocations in containers
