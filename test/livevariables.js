var esprima = require('esprima'),
    lib = require('../'),
    liveVariables = lib.analyses.liveVariables,
    ControlFlowGraph = lib.ControlFlowGraph;

/**
 * returns the analysis output for the entry node, since this is a
 * backwards analysis
 */
function doAnalysis(code) {
	var ast = esprima.parse(code);
	var cfg = ControlFlowGraph(ast);
	liveVariables(cfg);
	return cfg[0].output.map(function (v) { return v; });
}

describe('Live Variables', function () {

it('should work for basic example', function () {
	var actual = doAnalysis('var a = b + c;');
	actual.should.eql(['b', 'c']);
});

it('should work for loops', function () {
	var actual = doAnalysis(
		'var y = 0; var u = a + b; var y = a * u;' +
		'while (y > u) {' +
			'a = a + 1; u = a + b; x = u;' +
		'}'
		);
	actual.should.eql(['a', 'b']);
});
it('should work for branches', function () {
	var actual = doAnalysis(
		'var x = 0;' +
		'if (any) {' +
			'x = y;' +
		'} else {' +
			'x = z;' +
		'}'
		);
	actual.should.eql(['y', 'z', 'any']);
});
it('should work for objects', function () {
	var actual = doAnalysis(
		'var x = {a: a, b: b};' +
		'y.x = x.a;'
		);
	actual.should.eql(['y', 'a', 'b']);
});

}); // describe
