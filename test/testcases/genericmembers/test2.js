// should support computed MemberExpression with no knownvalue but type string
//number
var a = {a: 10};
a[0] = '';
var actual = a["" + ""];
