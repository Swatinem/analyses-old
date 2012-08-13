// WITH
function test(expected) {
  var o = {}, x = 234;
  with (o) { return x; }
}

test(0);
