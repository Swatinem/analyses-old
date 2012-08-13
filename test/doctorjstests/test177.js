// for/in shouldn't examine non-enumerable properties such as "length".
function test(expected) {
  var a = ["a", "b", "c"], s;
  
  for (var p in a) s = a[p];
  return s;
}

test("c");
