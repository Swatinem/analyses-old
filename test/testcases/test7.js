// should support custom prototype chain
//number
function Test(val) {
	this.a = val;
}
Test.prototype.foo = function () {
	return this.a;
}
new Test("a").foo();
var actual = new Test(10).foo();
