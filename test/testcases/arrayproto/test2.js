// should support Array.prototype.filter
//<number | string>
var a = ['str', 1];
var foo;
var a2 = a.filter(function (p) {
	foo = p
});
var actual = foo + a2[unknown];
