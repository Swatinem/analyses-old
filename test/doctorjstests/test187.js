// Looking for a computed property whose name you don't exactly know
function test(expected) {
  var o = {1 : 123};
  return o["" + "1"];
}

test(0);

