#!/usr/bin/env node

var esprima = require('esprima'),
    lib = require('../');
    findDeclarations = lib.findDeclarations,
    ControlFlowGraph = lib.ControlFlowGraph,
    printCFG = lib.printCFG,
    walker = lib.walker;
var escodegen = require('escodegen');

process.stdin.resume();
process.stdin.setEncoding('utf8');

var data = '';
process.stdin.on('data', function (chunk) {
	data+= chunk;
});
process.stdin.on('end', function () {
	var source = data;
	// filter out #! which is used by nodejs programs sometimes
	if (source.indexOf('#!') === 0) {
		source = '//' + source.substring(2);
	}
	var ast = esprima.parse(source);
	var functions = findDeclarations(ast, {recurse: true, expressions: true}).functions.concat([ast]);
	var cfgs = functions.map(ControlFlowGraph).map(function (cfg) { return cfg; });
	console.log('digraph cfg {');
	console.log('node [shape="box"]');
	var counter = {counter: 0};
	cfgs.forEach(function (cfg) {
		var analysis = process.argv[2];
		var isFunction = ~['FunctionDeclaration', 'FunctionExpression'].indexOf(cfg[0].astNode.type);
		if (analysis && lib.analyses[analysis]) {
			// typeInference can only analyze whole Programs
			if (analysis === 'typeInference' && isFunction)
				return;
			lib.analyses[analysis](cfg);
			label(cfg[1]);
		}
		if (cfgs.length > 1) {
			console.log('subgraph cluster_cfg' + counter.counter + ' {');
			var slabel = '[main]';
			if (isFunction && cfg[0].astNode.id)
				slabel = cfg[0].astNode.id.name;
			else if (isFunction)
				slabel = '[Anonymous]';
			console.log('label = "' + slabel + '"');
		}
		console.log(printCFG(cfg[0], counter));
		if (cfgs.length > 1)
			console.log('}');
	});
	console.log('}');
});

// create custom labels
function label(cfgNode) {
	if (cfgNode.label)
		return;
	cfgNode.label =
		(cfgNode.type || escodegen.generate(cfgNode.astNode)).clean() + '\\n[' + (cfgNode.output || []).join(', ').clean() + ']';
	cfgNode.prev.forEach(label);
}
String.prototype.clean = function () {
	return this.replace(/"/g, '\\"').replace(/\n/g, '\\n');
};
