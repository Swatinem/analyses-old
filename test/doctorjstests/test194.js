// IN
function test(expected) {
  var o = {};
  o = {x:123};
  return "x" in o;
}

var b = true;
b = false;
test(b);
