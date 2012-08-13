// FUNCTION not directly under a BLOCK or SCRIPT
function test(expected) {
  if (true)
    function f() {return 0;}
  return f();
}

test(0);
