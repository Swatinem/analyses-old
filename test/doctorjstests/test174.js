// global variables can also be accessed as properties of the global object
function test(expected) {
  this.NaN = "foo";
  return NaN;
}

test(0 || "foo");


