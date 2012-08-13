// LET_BLOCK not directly under a BLOCK or SCRIPT
function test(expected) {
  var a;
  if (true)
    let (x = 0) {
      a = x;
    }
  return a;
}

test(0);
