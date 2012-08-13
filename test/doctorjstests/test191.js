// IN
function test(expected) {
  return String().toString() in {};
}

var b = true;
b = false;
test(b);
