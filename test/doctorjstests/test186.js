// FOR/IN assigns the properties of o precisely
function test(expected) {
  var a = [0, true, ""], o = {};
  
  for (var p in a) o[p] = a[p];
  return o[2];
}

test("");
