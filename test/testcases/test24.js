// should not create new props on a parent prototype
//number
Object.prototype.foo = "str";
Function.prototype.foo = 1;
var actual = String.foo;
