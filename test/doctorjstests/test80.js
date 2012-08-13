// evalExp/ARGUMENTS: join all args
function test(expected) {
  function f(x) {
    return arguments[0 + 1];
  }

  return f(123, "asdf");
}

test(0 || "asdf");
