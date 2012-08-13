// LET definition
function test(expected) {
  let x = 123;
  let y = (let (z = 321) z);
  return x + y; 
}

test(0);
