// WITH: L-value
function test(expected) {
  var x = "asdf", o = {};
  with (o) { x += 1; }
  return x;
}

test("asdfasdfasdf".toString());
