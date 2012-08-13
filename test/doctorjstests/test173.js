function test(expected) {
  try {
    throw new SyntaxError("foo");
  }
  catch (e) {
    return e.message;
  }
}

test(SyntaxError.prototype.name);