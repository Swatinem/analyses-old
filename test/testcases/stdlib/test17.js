// should provide Function.prototype.apply with arguments
//number
var a = {a: 1};
var actual = (function (x) { return x; }).apply(a, [10]);
