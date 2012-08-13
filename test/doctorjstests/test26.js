function test(expected) {
  return Object.hasOwnProperty("asdf");
}

var b = true;
b = false;
test(b);
