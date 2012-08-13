#!/usr/bin/env node

var esprima = require('esprima'),
    ControlFlowGraph = require('../lib/controlflowgraph'),
    findDeclarations = require('../lib/finddeclarations'),
    printCFG = require('../lib/cfgtodot'),
    walker = require('../lib/walker');

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
	try {
		var ast = esprima.parse(source);
		var functions = findDeclarations(ast, {recurse: true}).functions.concat([ast]);
		var cfgs = functions.map(ControlFlowGraph).map(function (cfg) { return cfg[0]; });
		console.log('digraph cfg {');
		console.log('node [shape="box"]');
		cfgs.forEach(function (cfg) { console.log(printCFG(cfg)); });
		console.log('}');
	} catch (e) {
		throw e;
		console.log(JSON.stringify(e.toString()));
	}
});
