// Logical or: non-empty strings are truthy
function test(expected) {
  return "asdf" || 123;
}

test("asdf");

