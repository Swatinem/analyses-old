var esprima = require('esprima'),
    lib = require('../'),
    ControlFlowGraph = lib.ControlFlowGraph,
    typeInference = lib.analyses.typeInference,
    fs = require('fs');

function createTest(dir, file) {
	if (process.env.TESTFILE && process.env.TESTFILE !== file)
		return;
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true});
	ast.filename = dir + file;
	var comments = ast.comments;
	delete ast.comments;
	var title = comments[0].value.trim() + ' (' + file + ')';
	if (title.indexOf('TODO:') == 0)
		return it(title.substr(6));
	it(title, function () {
		var cfg = ControlFlowGraph(ast);
		var globals = typeInference(cfg);
		// the .output of the end node contains the final execution context
		// however, we try to use the output of the previous node in case a single
		// `normal` edge leads there, to avoid all those possible undefined values
		// because of the exception edges
		var exit = cfg[1];
		var context = exit.output[0];
		var normals = exit.prev.filter(function (n) { return n.normal === exit; })
			.reduce(function (arr, elem) {
				if (!~arr.indexOf(elem))
					arr.push(elem);
				return arr;
			}, []);
		if (normals.length === 1)
			context = normals[0].output[0];
		
		var ref = globals.GetIdentifierReference(context.LexicalEnvironment, 'actual', false);
		var value = globals.GetValue(ref);
		//console.log(context, ref, value);
		
		var expected = comments[1].value;
		var actual;
		if (value instanceof Array && value.length === 1)
		    value = value[0];
		if (value instanceof Array) {
			actual = '<' + value.map(function (e) { return e.Type.toLowerCase(); }).join(' | ') + '>';
		} else
			actual = value && value.Type.toLowerCase() || 'any';
		actual.should.equal(expected);
	});
}
function checkFiles(dir) {
	var files = fs.readdirSync(dir);
	files.forEach(function (file) {
		if (/\.js$/.test(file)) {
			createTest(dir, file);
		} else {
			// this may be a directory?
			describe(file, function () {
				checkFiles(dir + file + '/');
			});
		}
	});
}
describe('Type Inference', function () {
	var basedir = __dirname + '/typeinference/';
	checkFiles(basedir);
	
	it('should pretty print all the objects', function () {
		var ast = esprima.parse('var a, b = {a: any || 1, b: true, c: "str", d: null, e: a, f: function () {}}');
		var cfg = ControlFlowGraph(ast);
		typeInference(cfg);
		cfg[1].output.toString().should.eql('{"a": undefined, "b": {"a": [any, number:1], "b": boolean:true, "c": string:"str", "d": null, "e": undefined, "f": {"length": number:0, "prototype": {"constructor": [Cycle]}}}}');
	});
});
