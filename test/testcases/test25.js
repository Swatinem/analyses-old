// should provide object.constructor
//number
function Test() {
	this.x = 10;
}
var actual = new (new Test().constructor)().x;
