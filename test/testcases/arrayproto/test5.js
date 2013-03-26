// should support Array.prototype.forEach
//<string | number>
var a = ['str', 1];
a.forEach(function (p) {
	foo = p;
});
var actual = foo;
