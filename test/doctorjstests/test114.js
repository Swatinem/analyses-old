// test += on strings
function test(expected) {
  var x = 0;
  x += "asdf";

  return x;
}

test(0 || String(""));
