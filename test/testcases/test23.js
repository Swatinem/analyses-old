// should support assignment to not exactly known members
//number
var a = {};
a['a' + 'a'] = 1;
var actual = a['a' + 'a'];
