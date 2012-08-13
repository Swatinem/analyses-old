// WITH: lhs of assignment isn't id, no special treatment required
function test(expected) {
  var o = {x : {}};
  with (o) {
    x.y = 1;
  }
  return o.x.y;
}

test(0);
