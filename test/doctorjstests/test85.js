// unary_plus, unary_minus, ++, -- throw
function test(expected) {
  function t() { throw new Error(); }
  
  try {
    return + 1234 - 543 + (t()++) - (-t()--);
  }
  catch (e) {
    return e.message;
  }
}

test(0 || String(""));
