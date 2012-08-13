// test Boolean valueOf
function test(expected) {
  return (new Boolean()).valueOf();
}

var b = true;
b = false;
test(b);
