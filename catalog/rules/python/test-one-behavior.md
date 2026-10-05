---
id: python-test-one-behavior
lang: python
prefix: test
title: Test one behavior per method and name the method for that behavior
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [one behavior, naming, test method, focused]
  files: ["**/*.py"]
  symbols: [TestCase]
related: [python-test-isolation]
sources:
  - title: unittest - Organizing test code
    url: https://docs.python.org/3/library/unittest.html
  - title: Google Python Style Guide - Test modules
    url: https://google.github.io/styleguide/pyguide.html
---

> Test one behavior per method and name the method for that behavior.

## Why

A test that asserts several unrelated behaviors stops at the first failure, so the remaining checks never run and the failure report points at a bundle rather than a contract. One behavior per method keeps each failure diagnostic and lets the name state what is proven. The name replaces the comment that would otherwise explain the method.

## Bad

```python
import unittest


class TestCart(unittest.TestCase):
    def test_cart(self) -> None:
        cart = ["apple"]
        self.assertEqual(len(cart), 1)
        cart.clear()
        self.assertEqual(cart, [])
        self.assertNotIn("apple", cart)
```

## Good

```python
import unittest


class TestCart(unittest.TestCase):
    def test_add_puts_item_in_cart(self) -> None:
        cart = ["apple"]
        self.assertEqual(cart, ["apple"])

    def test_clear_removes_all_items(self) -> None:
        cart = ["apple"]
        cart.clear()
        self.assertEqual(cart, [])
```

## See Also

- [python-test-isolation](test-isolation.md) - keeping each of those focused tests independent
