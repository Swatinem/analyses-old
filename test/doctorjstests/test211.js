// LET expression
function test(expected) {
  return let (x=1, y=2) x + y;
}

test(0);
