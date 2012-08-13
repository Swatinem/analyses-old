function test(expected) {
  var a = new Array(), i, ret, p;

  i = 0;
  a[i] = 123;

  for (p in a) ret = a[p];

  return ret;
}

test(0);
