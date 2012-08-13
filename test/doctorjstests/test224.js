// Tests if the fixpoint computation for recursive functions returns prematurely
function test(expected) {
  var o = { 1 : "abc" };

  // Should return number or string
  function recur(x) {
    if (x === 1)
      return o[recur(0)];
    else
      return 1;
  }

  return recur(1);
}

// The analysis thinks that recur(0) may also return "abc"
test(1 || "abc" || undefined);
