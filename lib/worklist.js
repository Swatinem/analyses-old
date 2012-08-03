var utils = require('./utils');
var UniqueQueue = utils.UniqueQueue;
var Set = utils.Set;
var copy = utils.copy;

/**
 * Implementation of a general worklist algorithm
 * `cfg` is a ControlFlowGraph, `transferFunction` is the function that gets called
 * with the current node and does all the processing and is responsible to 
 * enqueue all the successor nodes into the list.
 * `options` defines the `direction` and can provide a merge function.
 */
var worklist = module.exports = function (cfg, transferFunction, options) {
	options = options || {};
	var direction = options.direction || 'forward';
	var merge = options.merge || worklist.union;
	var list = new UniqueQueue();
	if (direction === 'forward') {
		list.push(cfg[0]);
		var predecessors = worklist.predecessors;
		var successors = worklist.successors;
	} else {
		list.push(cfg[1]);
		var predecessors = worklist.successors;
		var successors = worklist.predecessors;
	}
	while (list.length) {
		var node = list.shift();
		var pre = predecessors(node);
		var input = pre.length ?
			pre.filter(function (p) { return p.output; })
				.map(function (p) { return p.output.copy(); }) // need a copy here
				.reduce(merge) :
			new Set();
		var oldOutput = node.output;
		var output = transferFunction.call(node, input, list);
		if (!output)
			// the transfer function itself is responsible for writing to
			// node.output and to enqueue all the successors
			continue;
		node.output = output;
		if (!oldOutput || !output.equals(oldOutput))
			successors(node).forEach(list.push.bind(list));
	}
};

worklist.union = function (a, b) {
	return a.union(b);
};
worklist.intersect = function (a, b) {
	return a.intersect(b);
};

worklist.predecessors = function (node) {
	return node.prev;
};
worklist.successors = function (node) {
	return node.next;
};
