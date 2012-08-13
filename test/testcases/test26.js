// should support `.prototype = new` pattern
//number
function Test() {
	this.x = 10;
}
function Test2() {}
Test2.prototype = new Test();
var actual = new Test2().x;
