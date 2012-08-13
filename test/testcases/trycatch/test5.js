// should support throwing functions
//string
try {
	(function () { throw new Error(); })();
} catch (e) {
	var actual = e.message;
}
