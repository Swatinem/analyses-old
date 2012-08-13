#!/usr/bin/env node

var esprima = require('esprima'),
    ControlFlowGraph = require('../lib/controlflowgraph'),
    printCFG = require('../lib/cfgtodot'),
    liveVariables = require('../lib/analyses/livevariables'),
    walker = require('../lib/walker');
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
	try {
		var ast = esprima.parse(source);
		var cfg = ControlFlowGraph(ast);
		liveVariables(cfg);
		// create custom labels
		function label(cfgNode) {
			if (cfgNode.label)
				return;
			cfgNode.label =
				(cfgNode.type || escodegen.generate(cfgNode.astNode)) + ' [' + cfgNode.output.join(', ') + ']';
			cfgNode.prev.forEach(label);
		}
		label(cfg[1]);
		
		console.log('digraph cfg {');
		console.log('node [shape="box"]');
		console.log(printCFG(cfg[0]));
		console.log('}');
	} catch (e) {
		throw e;
		console.log(JSON.stringify(e.toString()));
	}
});
