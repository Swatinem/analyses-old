// should support Array.prototype.some
//number
var a = ['str'];
var foo;
var b = a.some(function (p) {
	foo = 1;
});
var actual = foo + b;
