function test(expected) {
  var x = "asdf";
  let (x = 1) {
    return x;
  }
}

test(0);
