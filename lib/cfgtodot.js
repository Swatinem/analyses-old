var escodegen = require('escodegen');

var CFGtoDot = module.exports = function (cfgNode) {
	var output = '';
	var counter = 0;
	function printCFG(cfgNode) {
		if (cfgNode.counter)
			return;

		cfgNode.counter = counter++;
		var label;
		if (cfgNode.label)
			label = cfgNode.label;
		else {
			var label = cfgNode.type || cfgNode.astNode.type;
			if (label === 'entry'
					&& ~['FunctionDeclaration', 'FunctionExpression'].indexOf(cfgNode.astNode.type)) {
				if (cfgNode.astNode.id)
					label+= ' ' + cfgNode.astNode.id.name;
				else
					label+= ' [Anonymous]';
			} else if (label !== 'entry' && cfgNode.astNode) {
				// special cases for some statements:
				switch (cfgNode.astNode.type) {
					case 'SwitchCase':
						label = escodegen.generate(cfgNode.astNode).split('\n')[0];
						break;
					default:
						label = escodegen.generate(cfgNode.astNode).replace(/\n/g, '\\n');
				}
			}
		}
		var node = 'n' + cfgNode.counter + ' [label="' + label + '"';
		if (~['entry', 'exit'].indexOf(cfgNode.type))
			node+= ', style="rounded"';
		node+= ']\n';
		output+= node;
		['normal', 'true', 'false', 'exception'].forEach(function (type) {
			var next = cfgNode[type];
			if (!next)
				return;
			printCFG(next);
			var link = 'n' + cfgNode.counter + ' -> n' + next.counter + ' [';
			if (type === 'exception')
				link+= 'color="red", label="exception"'
			else if (~['true', 'false'].indexOf(type))
				link+= 'label="' + type + '"';
			link+= ']\n';
			output+= link;
		});
	}
	printCFG(cfgNode);
	return output;
};
