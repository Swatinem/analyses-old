// LET expression
function test(expected) {
  var x = "asdf";
  return let (x = 1) x;
}

test(0);
