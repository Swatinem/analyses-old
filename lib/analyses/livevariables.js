var walker = require('../walker');
var worklist = require('../worklist');
var Set = require('../utils').Set;

module.exports = function liveVariables(cfg) {
	worklist(cfg, function (input) {
		if (this.type || !this.astNode)
			return input;
		var kill = this.kill = this.kill || findAssignments(this.astNode);
		var generate = this.generate = this.generate || findVariables(this.astNode);
		return input.removeAll(kill).union(generate);
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
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
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
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
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
