function test(expected) {
  try {
    if (123)
      throw 123;
    else
      throw "";
  }
  catch (e) {
    return e;
  }
}

test(0 || "");
