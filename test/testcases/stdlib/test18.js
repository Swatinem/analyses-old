// should provide Function.prototype.call
//number
var a = {a: 1};
var actual = (function () { return this.a; }).call(a);
