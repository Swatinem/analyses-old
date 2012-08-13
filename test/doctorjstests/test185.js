// Computed properties aren't precise enough to avoid undefined here.
function test(expected) {
  var o = {a : ""}, x = "asdf";
  x = "a";
  o[x] = 0;
  return o.a;
}

test(0 || "" || undefined);
