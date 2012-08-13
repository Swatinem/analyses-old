// FOR EACH ... IN: unsound, ignore the isEach property & treat as FOR_IN
function test(expected) {
  var s;
  for each (var p in {x: 1, y: 2}) { s += p; }
  return s;
}

test(String(""));
