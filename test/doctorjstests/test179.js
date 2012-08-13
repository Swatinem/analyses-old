// the object of a for/in throws
function test(expected) {
  function foo() { throw new Error(); }

  try {
    for (var p in foo()) ;
  }
  catch (e) { return 123; }
}

test(0);
