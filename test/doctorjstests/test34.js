// test Array constructor without new
function test(expected) {
  var a1 = Array(0, 1);
  var a2 = Array("asdf", "adf");
  return a2[0]; // a1 and a2 are merged
}

test(0 || "asdf");



