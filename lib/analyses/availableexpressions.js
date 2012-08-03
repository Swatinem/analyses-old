var walker = require('../walker');
var worklist = require('../worklist');
var escodegen = require('escodegen');
var utils = require('../utils');
var equals = utils.equals;
var Set = utils.Set;

module.exports = function availableExpressions(cfg) {
	worklist(cfg, function (input, list) {
		if (this.type || !this.astNode)
			return input;
		var kill = this.kill = this.kill || findAssignments(this.astNode);
		var generate = this.generate = this.generate || findExpressions(this.astNode);
		return (new Set).union(input.filter(function (elem) {
			var expr = elem.node;
			try {
				walker(expr, {
					Identifier: function () {
						if (~kill.indexOf(this.name))
							throw true;
					}
				});
			} catch (e) {
				return false;
			}
			return true;
		})).union(generate);
	}, {direction: 'forward', merge: worklist.intersect});
	
	return cfg;
};

function Expression(node) {
	this.node = node;
}
Expression.prototype = {
	copy: function () {
		return this; // this is never modified in-place so we don’t need a copy
	},
	equals: function (that) {
		return equals(this.node, that.node);
	},
	toString: function () {
		return escodegen.generate(this.node);
	}
};

function findExpressions(astNode) {
	var expressions = [];
	// FIXME: just handle binary expressions so far
	walker(astNode, {
		BinaryExpression: function (recurse) {
			expressions.push(new Expression(this));
			recurse(this.right);
			recurse(this.left);
		}
	});
	return expressions;
}
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
