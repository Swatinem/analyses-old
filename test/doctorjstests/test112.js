// RegExp.prototype.test
function test(expected) {
  return (new RegExp()).test("asfasdf") || /abc/.test("a");
}

var b = true;
b = false;
test(b);
