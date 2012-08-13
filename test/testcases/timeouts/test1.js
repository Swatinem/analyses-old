// should call the callback of setTimeout
//number
var a;
setTimeout(function () { a = 1; }, 0);
var actual = a;
