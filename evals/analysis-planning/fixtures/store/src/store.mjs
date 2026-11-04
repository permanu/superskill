export function createStore(journal) {
  return { values: new Map(), journal };
}

export function put(store, id, value) {
  store.values.set(id, value);
  store.journal.append({ id, value });
  return value;
}

export function get(store, id) {
  return store.values.get(id);
}
