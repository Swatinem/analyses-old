// should support Array.prototype.every
//number
var a = ['str'];
var foo;
var b = a.every(function (p) {
	foo = 1;
});
var actual = foo + b;
