// should support computed MemberExpression with no knownvalue but type number
//string
var a = {a: 10};
a[0] = '';
var actual = a[0 + 0];
