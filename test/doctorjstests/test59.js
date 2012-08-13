// plus-left throws
function test(expected) {
  function t() {throw new Error("asdf");}

  try {
    t() + 123;
  }
  catch (e) {
    return e.message;
  }
}

test("asdf");
