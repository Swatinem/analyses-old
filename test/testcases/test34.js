// should support Object.keys
//string
var o = {a: 'str'};
var k = Object.keys(o);
var actual = o[k[0]];
