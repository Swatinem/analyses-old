function test(expected) {
  return isNaN("sadf");
}

var b = true;
b = false;
test(b);
