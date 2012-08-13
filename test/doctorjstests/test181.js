// Logical or: the empty string is falsy
function test(expected) {
  return "" || 123;
}

test(0);
