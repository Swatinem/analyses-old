var utils = require('./utils');
var UniqueQueue = utils.UniqueQueue;
var Set = utils.Set;

/**
 * Implementation of a general worklist algorithm
 * `cfg` is a ControlFlowGraph, `evalFunc` is the function that gets called
 * with the current node and does all the processing and is responsible to 
 * enqueue all the successor nodes into the list.
 * `options` defines the `direction` and can provide a merge function.
 */
var worklist = module.exports = function (cfg, evalFunc, options) {
	options = options || {};
	var direction = options.direction || 'forward';
	var merge = options.merge || worklist.union;
	var list = new UniqueQueue();
	list.push(direction === 'forward' ? cfg[0] : cfg[1]);
	while (list.length) {
		var node = list.shift();
		var pre = predecessors(node, direction);
		var input = new Set();
		if (pre.length) {
			input = new Set(pre[0].output);
			for (var i = 1; i < pre.length; i++) {
				input = merge(input, pre[i].output || []);
			}
		}
		evalFunc.call(node, input, list);
	}
};

worklist.union = function (a, b) {
	return a.union(b);
};
worklist.intersect = function (a, b) {
	return a.intersect(b);
};

function predecessors(node, direction) {
	var pre = [];
	if (direction === 'backward') {
		['normal', 'true', 'false', 'exception'].forEach(function (type) {
			if (!node[type])
				return;
			pre.push(node[type]);
		});
	} else { // forward
		pre = node.prev;
	}
	return pre;
}

