// WITH: inside a try block, find varDecls of the script correctly
function test(expected) {
  var o = {e:1};
  
  try {
    with (o) { return e; }
  }
  catch (e) { }
}

test(0);
