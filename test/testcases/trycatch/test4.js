// should support Error
//string
try {
	throw new Error("");
} catch (e) {
	var actual = e.message;
}
