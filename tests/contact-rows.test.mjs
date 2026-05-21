import test from "node:test";
import assert from "node:assert/strict";
import { markContactRowStarts } from "../src/contactRows.js";

class FakeClassList {
  constructor(initial = []) {
    this.values = new Set(initial);
  }

  add(className) {
    this.values.add(className);
  }

  remove(className) {
    this.values.delete(className);
  }

  contains(className) {
    return this.values.has(className);
  }
}

function createContact(offsetTop, initialClasses = []) {
  return {
    offsetTop,
    classList: new FakeClassList(initialClasses)
  };
}

function createRoot(contacts) {
  return {
    querySelectorAll: (selector) => {
      assert.equal(selector, ".resume-contacts .contact");
      return contacts;
    }
  };
}

test("marks the first contact on each visual row", () => {
  const contacts = [
    createContact(0),
    createContact(0),
    createContact(22),
    createContact(22),
    createContact(44)
  ];

  markContactRowStarts(createRoot(contacts));

  assert.deepEqual(contacts.map((contact) => contact.classList.contains("contact-row-start")), [
    true,
    false,
    true,
    false,
    true
  ]);
});

test("clears stale row-start marks before recomputing rows", () => {
  const contacts = [
    createContact(0, ["contact-row-start"]),
    createContact(0, ["contact-row-start"]),
    createContact(0)
  ];

  markContactRowStarts(createRoot(contacts));

  assert.deepEqual(contacts.map((contact) => contact.classList.contains("contact-row-start")), [
    true,
    false,
    false
  ]);
});
