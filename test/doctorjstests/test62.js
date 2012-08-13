// evalLval: rval throws
function test(expected) {
  function t() {throw new Error("foo");}

  try {
    var x = t();
  }
  catch (e) {
    return e.message;
  }
}

test("foo");
