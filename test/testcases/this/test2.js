// should support assignment to global object `this`
//number
function f() {
	this.b = 10;
}
f();
var actual = b;
