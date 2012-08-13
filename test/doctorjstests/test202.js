// WITH: catch variable shadows
function test(expected) {
  var o = {e:1};
  
  with (o) {
    try {
      throw new Error("");
    }
    catch (e) {
      return e.message;
    }
  }
}

test("");
