// WITH not directly under a BLOCK or SCRIPT
function test(expected) {
  var o = {a:0};
  if (true)
    with (o) return a;
}

test(0);
