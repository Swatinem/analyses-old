// should never chain up when accessing .prototype
//undefined

function Test() {}
Test.prototype.foo = 10;
var actual = "str".foo;
