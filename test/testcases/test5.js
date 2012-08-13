// should support nested function call
//number
function first(a) {
	var b = a;
	function second() {
		return b;
	}
	return second();
}
var actual = first(10);
