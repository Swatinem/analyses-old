// WITH: L-value
function test(expected) {
  var o = {x : 1};
  with (o) { x = "asdf"; }
  return o.x
}

test(0 || "asdf");
