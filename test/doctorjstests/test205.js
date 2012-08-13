// WITH: rewrite for/in
function test(expected) {
  var o = {x:1}, o2 = {"asdf" : 1};
  with (o) {
    for (x in o2) ;
  }
  return o.x;
}

test(0 || String(""));
