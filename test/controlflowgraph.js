var esprima = require('esprima'),
    lib = require('../'),
    ControlFlowGraph = lib.ControlFlowGraph,
    printCFG = lib.printCFG,
    fs = require('fs');

function createTest(dir, file) {
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true});
	var comments = ast.comments;
	delete ast.comments;
	it(comments[0].value.trim() + ' (' + file + ')', function () {
		if (ast.body[0].type === 'FunctionDeclaration')
			ast = ast.body[0].body;
		var cfg = ControlFlowGraph(ast);
		var actual = printCFG(cfg[0]);
		if ('\n' + actual !== comments[1].value)
			console.log(actual);
		('\n' + actual).should.equal(comments[1].value);
	});
}
function checkFiles(dir) {
	var files = fs.readdirSync(dir);
	files.forEach(function (file) {
		if (/\.js/.test(file)) {
			createTest(dir, file);
		} else {
			// this may be a directory?
			describe(file, function () {
				checkFiles(dir + file + '/');
			});
		}
	});
}
describe('Control Flow Graph creation', function () {
	var basedir = __dirname + '/cfgtests/';
	checkFiles(basedir);
});
