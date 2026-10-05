---
id: rust-doc-hidden-setup
lang: rust
prefix: doc
title: "Use `# ` prefix to hide example setup code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["hidden", "setup", "prefix", "hide", "example", "code"]
  files: ["**/*.rs"]
related: ["rust-doc-examples-section", "rust-doc-question-mark", "rust-test-doctest-examples"]
sources:
  - title: "rust-skills: doc-hidden-setup"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-hidden-setup.md
---
> Use `# ` prefix to hide example setup code

## Why

Doc examples need setup code (imports, struct initialization, mock data) that distracts from the main point. The `# ` prefix hides lines from rendered documentation while keeping them in the compiled test, showing users only the relevant code.

This keeps examples focused and readable while ensuring they still compile and run.

## Bad

```rust
pub struct Processor;
pub struct Config;
pub struct Item;
pub struct Results;
pub struct Error;

impl Processor {
    /// Processes a batch of items.
    ///
    /// # Examples
    ///
    /// ```
    /// use my_crate::{Processor, Config, Item};
    /// let config = Config { batch_size: 100, timeout_ms: 5000, retry_count: 3 };
    /// let processor = Processor::new(std::sync::Arc::new(config));
    /// let items = vec![Item::new("a"), Item::new("b"), Item::new("c")];
    /// let results = processor.process_batch(&items)?;
    /// assert!(results.all_succeeded());
    /// # Ok::<(), my_crate::Error>(())
    /// ```
    pub fn process_batch(&self, items: &[Item]) -> Result<Results, Error> {
        let _ = items;
        Ok(Results)
    }
}
```

## Good

```rust
pub struct Processor;
pub struct Config;
pub struct Item;
pub struct Results;
pub struct Error;
impl Processor {
    /// Processes a batch of items.
    ///
    /// # Examples
    ///
    /// ```
    /// # use my_crate::{Processor, Config, Item};
    /// # let config = Config { batch_size: 100, timeout_ms: 5000, retry_count: 3 };
    /// # let processor = Processor::new(std::sync::Arc::new(config));
    /// # let items = vec![Item::new("a"), Item::new("b"), Item::new("c")];
    /// # impl Results { fn all_succeeded(&self) -> bool { true } }
    /// let results = processor.process_batch(&items)?;
    /// assert!(results.all_succeeded());
    /// # Ok::<(), Error>(())
    /// ```
    pub fn process_batch(&self, items: &[Item]) -> Result<Results, Error> {
        let _ = items;
        Ok(Results)
    }
}
```

## See Also

- [rust-doc-examples-section](doc-examples-section.md) - Writing examples
- [rust-doc-question-mark](doc-question-mark.md) - Using `?` in examples
- [rust-test-doctest-examples](test-doctest-examples.md) - Doctests as tests
