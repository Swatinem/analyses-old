// test plus
function test(expected) {
  var x;
  x = 0;
  x = "0";
  return x + 0;
}

test(0 || String(""));

