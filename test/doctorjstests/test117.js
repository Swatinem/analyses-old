// SWITCH
function test(expected) {
  var x;
  switch (123) {
  case (x = 1):
    break;
  case 2:
    break;
  default:
    x = "";
    break;
  }
  return x;
}

test(0 || "");
