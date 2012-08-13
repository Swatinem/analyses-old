// WITH
function test(expected) {
  var o = {x : 1};
  with (o) { return x; }
}

test(0);
