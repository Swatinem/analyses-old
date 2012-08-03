var esprima = require('esprima'),
    lib = require('../'),
    availableExpressions = lib.analyses.availableExpressions,
    ControlFlowGraph = lib.ControlFlowGraph
    Set = require('../lib/utils').Set;

/**
 * returns the analysis output for the exit node, since this is a
 * forward analysis
 */
function doAnalysis(code) {
	var ast = esprima.parse(code);
	var cfg = ControlFlowGraph(ast);
	availableExpressions(cfg);
	var exit = cfg[1];
	
	// exception edges mess up everything, so rather use the node before the exit
	// node
	var normals = exit.prev.filter(function (n) { return n.normal === exit; })
		.reduce(function (arr, elem) {
			if (!~arr.indexOf(elem))
				arr.push(elem);
			return arr;
		}, []);
	if (normals.length === 1)
		exit = normals[0];
	return exit.output.join(', ');
}

describe('Available Expressions', function () {

it('should work for basic example', function () {
	var actual = doAnalysis('var a = b + c; var c = a + b;');
	var expected = esprima.parse('(a + b)').body[0].expression;
	actual.should.eql('a + b');
});

it('should work for loops', function () {
	var actual = doAnalysis(
		'var x = a + b; var y = a * x;' +
		'while (y > a + b) {' +
			'a = a + 1; x = a + b;' +
		'} expr;'
		);
	actual.should.eql('a + b, y > a + b');
});

it('should work for branches', function () {
	var actual = doAnalysis(
		'var x = 0;' +
		'if (any) {' +
			'x = a + b;' +
		'} else {' +
			'x = a + b;' +
			'y = a + c;' +
		'} expr;'
		);
	actual.should.eql('a + b');
});

}); // describe
