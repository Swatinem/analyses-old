// should support Object.create
//number
function Test() {}
Test.prototype.x = 10;
function Test2() {}
Test2.prototype = Object.create(Test.prototype);
var actual = new Test2().x;
