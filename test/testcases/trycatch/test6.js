// should merge the returns in try and catch
//<number | string>
var actual = (function() {
	function t() { throw new Error(); }
	try {
		t();
		return 10;
	} catch (e) {
		return e.message;
	}
})();
