function test(expected) {
  var a = new Array(10, "1");
  a.shift();
  return a[0];
}

test(0 || "1");
