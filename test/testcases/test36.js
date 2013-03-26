// should merge all the prop names with multiple Object.keys arguments
//string
var o;
if (unknown)
	o = {a: 1};
else
	o = {b: 1};

var actual = Object.keys(o)[0];
