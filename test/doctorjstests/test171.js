function test(expected) {
  function example(v, f) {
    return v[f];
  }

  function foo() {
    return example({b:5}, "b");
  }

  return foo();
}

test(0);
