// should provide Function.prototype.apply
//number
var a = {a: 1};
var actual = (function () { return this.a; }).apply(a);
