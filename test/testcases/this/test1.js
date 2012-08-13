// should mirror props of the global object inside `this`
//number
var b = 10;
function f() {
	return this.b;
}
var actual = f();
