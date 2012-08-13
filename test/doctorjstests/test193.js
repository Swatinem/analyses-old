// IN
function test(expected) {
  return "x" in { x: 123 };
}

test(true);
