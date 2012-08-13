// test that summaries use the timestamp of the entry, not of the exit.
function test(expected) {
  var h = 123;
  
  function f(x) {
    var res = x + h;
    h = "asdf"; //change type *after* using h
    return res;
  }

  f(1);
  return f(1); // new type can only reveal itself here
}

test(0 || String(""));
