// should support assigning this to an outer var
//number

var outer;
function Test(x) {
	this.x = x;
	outer = this;
	return 10;
}

new Test(10);
var actual = outer.x;
