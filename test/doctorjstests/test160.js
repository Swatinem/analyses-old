// apply a built-in, arity 1
function test(expected) {
  return isNaN.apply(new Object(), "sdf");
}

var b = true;
b = false;
test(b);
