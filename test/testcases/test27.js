// should support Function.prototype.prototype 
//number
Function.prototype.foo = 3;
Object.prototype.foo = "3";
Object.prototype.bar = 3;

var actual = Function.foo + Function.prototype.prototype.bar;
