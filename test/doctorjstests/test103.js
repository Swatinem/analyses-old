// delete
function test(expected) {
  var b = true;
  b = void 0;
  return delete b;
}

var b = true;
b = false;
test(b);
