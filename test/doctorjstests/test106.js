// hook throws
function test(expected) {
  function E1() { this.foo = 0; }
  E1.prototype = new Error();

  function E2() { this.foo = ""; }
  E2.prototype = new Error();

  function t(e) { throw e; }
  
  try {
    123 ? t(new E1()) : t(new E2());
  }
  catch (e) {
    return e.foo;
  }
}

test(0 || "");
