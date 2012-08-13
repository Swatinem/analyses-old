// the iterator expression of a for/in throws
function test(expected) {
  function foo() { throw new Error(); }

  try {
    for ([foo()][0] in {a:1, b:2}) ;
  }
  catch (e) { return 123; }
}

test(0);
