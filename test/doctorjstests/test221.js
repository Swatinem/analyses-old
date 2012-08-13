// LET in for-loop head
function test(expected) {
  for (let i = 0; i < 5; i++)
    return i;
}

test(0);
