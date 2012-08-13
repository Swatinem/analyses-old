var esprima = require('esprima'),
    inferTypes = require('../').inferTypes,
    fs = require('fs');

var dir = __dirname + '/../';

function createTest(file) {
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true});
	ast.filename = dir + file;
	var comments = ast.comments;
	delete ast.comments;
	it('should work for '+ file, function () {
		var types = inferTypes(ast);
	});
}

describe('Acceptance', function () {7
	var tests = [
		'lib/infertypes/evaluate.js',
		'node_modules/esprima/esprima.js',
		'test/acceptance.js'
	];
	tests.forEach(createTest);
});
