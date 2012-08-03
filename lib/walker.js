var walker = module.exports = function (astNode, functionTable, offset) {
	function stop() { throw stop; }
	var recurse = function (astNode) {
		if (!astNode || typeof astNode !== 'object' || !astNode.type)
			return;
		// range based recursion: only recurse when the astNode is in range
		if (offset !== undefined && astNode.range &&
		    (astNode.range[0] >= offset || astNode.range[1] < offset))
			return;
		
		var fn = functionTable[astNode.type] || functionTable.default || checkProps;
		return fn.call(astNode, recurse, stop);
	}
	try {
		return recurse(astNode);
	} catch (e) {
		if (e !== stop)
			throw e;
	}
}

function checkProps(recurse) {
	var self = this;
	Object.keys(self).forEach(function (key) {
		var prop = self[key];
		if (!prop || typeof prop !== 'object')
			return;
		if (prop instanceof Array) {
			prop.forEach(recurse);
		} else
			recurse(prop);
	});
}

walker.checkProps = checkProps;
