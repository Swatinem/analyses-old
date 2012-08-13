// Use a "numeric" string to access a property
function test(expected) {
  var a = [1, 2], p = "0";
  return a[p];
}

test(0);

