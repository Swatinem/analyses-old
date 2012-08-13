// GETTER/SETTER: unsound handling just to avoid crashing
function test(expected) {
  var o = {a:7, get b () {return this.a + 1;}, set c (x) {this.a = x / 2;}};
  return o.b;
}

test(true);

