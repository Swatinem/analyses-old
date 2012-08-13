function test(expected) {
  function Foo() { this.x = 1; }
  return (new Foo).x;
}

test(0);
