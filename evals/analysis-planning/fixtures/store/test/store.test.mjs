import assert from "node:assert/strict";
import { test } from "node:test";
import { createStore, get, put } from "../src/store.mjs";

test("replacement changes the value and appends another event", () => {
  const events = [];
  const store = createStore({ append: event => events.push(event) });
  put(store, "a", "first");
  put(store, "a", "second");
  assert.equal(get(store, "a"), "second");
  assert.deepEqual(events, [{ id: "a", value: "first" }, { id: "a", value: "second" }]);
});

test("a failed journal append leaves the new value in memory", () => {
  const store = createStore({ append: () => { throw new Error("journal unavailable"); } });
  assert.throws(() => put(store, "a", "first"), /journal unavailable/);
  assert.equal(get(store, "a"), "first");
});
