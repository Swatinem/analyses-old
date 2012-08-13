var esprima = require('esprima'),
    inferTypes = require('../').inferTypes,
    fs = require('fs');

function createTest(dir, file) {
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true});
	ast.filename = dir + file;
	var comments = ast.comments;
	delete ast.comments;
	it(comments[0].value + ' (' + file + ')', function () {
		var types = inferTypes(ast);
		var expected = comments[1].value;
		var actual = types.vars['actual-'].toString();
		actual.should.equal(expected);
	});
}
function checkFiles(dir) {
	var files = fs.readdirSync(dir);
	files.forEach(function (file) {
		if (/test\d+\.js/.test(file)) {
			createTest(dir, file);
		} else {
			// this may be a directory?
			describe(file, function () {
				checkFiles(dir + file + '/');
			});
		}
	});
}
describe('inferTypes', function () {
	var basedir = __dirname + '/testcases/';
	checkFiles(basedir);
});
