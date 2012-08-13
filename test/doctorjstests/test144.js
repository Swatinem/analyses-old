// stack ref of a heap var updated, heap ref gets the correct value
function test(expected) {
  function f(x) {
    x = 42;
    return (function g() { return x; });
  }

  return f("")();
}

test(0 || "");
