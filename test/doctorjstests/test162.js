// apply a built-in, arity 0 (variable arity function)
function test(expected) {
  var a = [];
  Array.prototype.push.apply(a, [2, 3, "4"]);
  return a[2];
}

test(0 || "4");
