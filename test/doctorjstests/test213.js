// LET expression: substitutions do the right thing
function test(expected) {
  return let (y = "qwer") let (y = 123) y;
}

test(0);
