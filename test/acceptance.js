var esprima = require('esprima'),
    lib = require('../'),
    ControlFlowGraph = lib.ControlFlowGraph,
    typeInference = lib.analyses.typeInference,
    fs = require('fs');

var dir = __dirname + '/../';

function createTest(file) {
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true});
	ast.filename = dir + file;

	var comments = ast.comments;
	delete ast.comments;
	it('should work for '+ file, function () {
		var cfg = ControlFlowGraph(ast);
		var globals = typeInference(cfg);
	});
}

describe('Acceptance', function () {
	var tests = [
		'lib/index.js',
		'lib/controlflowgraph.js',
		'node_modules/esprima/esprima.js',
		'test/acceptance.js'
	];
	tests.forEach(createTest);
});
