// should kind of support Array.prototype.map()
//string
var a = ['str'];
var a2 = a.map(function (p) { return {a: p}; });
var actual = a2[0].a;
