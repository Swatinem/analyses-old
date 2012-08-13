// evalExp/CALL: rator throws
function test(expected) {
  function t() {throw new Error("");}

  function id(x) {return x;}
  
  try {
    (id(t()))();
  }
  catch (e) {
    return e.message;
  }
}

test("");
