var walker = require('../walker');
var worklist = require('../worklist');
var Set = require('../utils').Set;

module.exports = function liveVariables(cfg) {
	worklist(cfg, function (input, list) {
		var oldOutput = this.output;
		var output = this.output = input;
		
		if (!this.type && this.astNode) {
			var kill = findAssignments(this.astNode);
			var generate = findVariables(this.astNode);
			kill.forEach(function (elem) {
				var pos = output.indexOf(elem);
				if (pos != -1)
					output.splice(pos, 1);
			});
			generate.forEach(function (elem) {
				if (!~output.indexOf(elem))
					output.push(elem);
			});
		}
		
		// enqueue all previous nodes
		if (!oldOutput || !oldOutput.equals(this.output))
			this.prev.forEach(function (n) { list.push(n); });
	}, {direction: 'backward'});
	
	return cfg;
};

function findAssignments(astNode) {
	var variables = [];
	walker(astNode, {
		AssignmentExpression: function (recurse) {
			if (this.left.type === 'Identifier' && !~variables.indexOf(this.left.name))
				variables.push(this.left.name);
			recurse(this.right);
		},
		VariableDeclarator: function (recurse) {
			if (!~variables.indexOf(this.id.name))
				variables.push(this.id.name);
			if (this.init)
				recurse(this.init);
		}
	});
	return variables;
}
function findVariables(astNode) {
	var variables = [];
	walker(astNode, {
		AssignmentExpression: function (recurse) {
			if (this.left.type !== 'Identifier')
				recurse(this.left);
			recurse(this.right);
		},
		Identifier: function () {
			if (!~variables.indexOf(this.name))
				variables.push(this.name);
		},
		MemberExpression: function (recurse) {
			recurse(this.object);
		},
		Property: function (recurse) {
			recurse(this.value);
		},
		VariableDeclarator: function (recurse) {
			recurse(this.init);
		}
	});
	return variables;
}
