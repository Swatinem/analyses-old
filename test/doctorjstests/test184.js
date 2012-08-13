function test(expected) {
  var o = {a : 1, b : "asdf"}, p = "a";
  return o[p];
}

test(0);
