// should support rethrow
//number
try {
	try {
		throw "";
	} catch (e) {
		throw 10;
	}
} catch (e) {
	var actual = e;
}
