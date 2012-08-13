// LET in for-loop head shadows correctly
function test(expected) {
  var s = "asdf";
  for (let i = 0, s = 0; i < 5; i++) {
    s += i;
  }
  return s;
}

test("asdf");
