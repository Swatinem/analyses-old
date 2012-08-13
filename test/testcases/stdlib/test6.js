// should allow adding new prototype methods
//number
var str = "hi";
String.prototype.foo = function () {
	return 10;
}
var actual = str.foo();
