// Create cycle in the prototype chain. Look up a property w/out diverging.
function test(expected) {
  function B() {}
  function A() {}
  
  function makeB() { 
    return new B();
  }

  A.prototype  = makeB();
  var a = new A();
  B.prototype = a;
  var bcirc = makeB();

  return bcirc.nothing;
}

test(undefined);
