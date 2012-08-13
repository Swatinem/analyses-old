// functions declared in blocks
function test(expected) {
  if (true) {
    function id(x) {return x;}
  }

  return id(0);
}

test(0);
