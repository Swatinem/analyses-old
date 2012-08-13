// If Aobj.prototype.hasProp doesn't find cycles, the analysis runs out of stack here.
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

  for (var p in bcirc) {
    var dead = 123;
  }
}

test(undefined);
