// minus-left throws
function test(expected) {
  function t() {throw new Error("foo");}

  try {
    t() - 123;
  }
  catch (e) {
    return e.message;
  }
}

test("foo");
