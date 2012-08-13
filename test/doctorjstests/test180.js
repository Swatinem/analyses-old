// convert a boolean to an object automatically
function test(expected) {
  var b = true;
  return b.toString();
}

test(String(""));
