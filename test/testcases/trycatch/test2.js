// should move variable declarations inside catch to the outer frame
//string
try {
	throw "";
} catch (e) {
	var actual = e;
}
