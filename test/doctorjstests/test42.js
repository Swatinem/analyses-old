// Array.prototype.unshift
function test(expected) {
  var a = new Array();
  a.unshift(1, "");
  var i = 0;
  return a[i];
}

test(0 || "");
