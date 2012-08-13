// should provide Function.prototype.call with arguments
//number
var a = {a: 1};
var actual = (function (x) { return x; }).call(a, 10);
