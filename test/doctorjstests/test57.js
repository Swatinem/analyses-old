// expr that throws: function call
function test(expected) {
  function t() {throw new Error("");}

  try {
    t();
  }
  catch (e) {
    return e.message;
  }
}

test("");
