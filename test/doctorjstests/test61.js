// minus-right throws
function test(expected) {
  function t() {throw new Error("foo");}

  try {
    123 - t();
  }
  catch (e) {
    return e.message;
  }
}

test("foo");
