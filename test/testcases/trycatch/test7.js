// should record throws as part of an expression
//<number | string>
var actual = (function() {
	function t() { throw new Error(); }
	try {
		return t() - t();
	} catch (e) {
		return e.message;
	}
})();
