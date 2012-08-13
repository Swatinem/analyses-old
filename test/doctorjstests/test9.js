function test(expected) {
  
  function Foo(x) {
    this.x = x;
  }

  var o = new Foo(0);
  o = new Foo("asdf");
  return o.x;
}

test(0 || "asdf");
