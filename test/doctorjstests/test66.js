// evalExp/COMMA: first throws
function test(expected) {
  function t() {throw new Error("");}

  try {
    t(), 123;
  }
  catch (e) {
    return e.message;
  }
}

test("");
