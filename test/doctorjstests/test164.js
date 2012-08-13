// properties of regexps defined correctly
function test(expected) {
  return /asdf/.global;
}

var b = true;
b = false;
test(b);
