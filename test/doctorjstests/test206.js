// unsound. When I rewrite the for/in, I need to clone the body 
// o/w markConts does the wrong thing.

// WITH: rewrite for/in
function test(expected) {
  var o = {}, o2 = {"asdf" : 1}, x = 1;
  with (o) {
    for (x in o2) ;
  }
  return x;
}

test(0);
