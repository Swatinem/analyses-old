// test FINALLY
function test(expected) {
  function t() { throw new Error(); }

  var ret;

  try {
    t();
  }
  catch (e) {
    ret = e.message;
  }
  finally {
    ret = 123;
  }

  return ret;
}

test(0 || String(""));
