var walker = require('../walker');
var value = require('./value');
var Value = value.Value;
var Reference = value.Reference;
var stdlibInit = require('./stdlib');
var findDeclarations = require('../finddeclarations');

var evaluate;
var stdlib;
/**
 * This returns the identifiers for function declarations, as they need to be
 * handled separately because they are callable before they are defined: 
 * `f(); function f() {}`
 */
function FunctionValue(astNode, parentFrame) {
	// FIXME: functions should get different parent frame for each declaration
	var fun = stdlib.newFunction(function (thisVal, argVals) {
		var frame = {thisVal: thisVal, vars : {}, parent: parentFrame};
		// hoist the declarations
		hoistDeclarations(astNode, frame);
		// bind formal parameters
		for (var i in astNode.params) {
			var param = astNode.params[i];
			var propname = param.name + '-';
			if (!(propname in frame.vars)) {
				frame.vars[propname] = new Reference();
			}
			frame.vars[propname].assign(argVals[i]);
		}
		// create `arguments` object:
		var args = stdlib.newObject()[0];
		args.set('length', stdlib.newNumber());
		argVals.forEach(function (arg, index) {
			args.set(index, arg);
		});
		frame.vars['arguments-'] = new Reference(args);
		if (!astNode.frame)
			Object.defineProperty(astNode, 'frame', {value: frame});
		return evaluate(astNode.body, frame);
	});
	// record a list of all function objects in the global scope:
	var global = parentFrame;
	while (global.parent)
		global = global.parent;
	if (global.allFunctions)
		global.allFunctions.push(fun);
	return fun;
}

/**
 * Adds all the variable and function declarations to the provided frame
 */
function hoistDeclarations(astNode, frame) {
	var declarations = findDeclarations(astNode);
	function addToScope(node) {
		var propname = node.id.name + '-';
		if (!(propname in frame.vars)) {
			frame.vars[propname] = new Reference();
		}
	}
	declarations.functions.forEach(addToScope);
	declarations.variables.forEach(addToScope);
	// create hoisted functions
	declarations.functions.forEach(function (f) {
		var propname = f.id.name + '-';
		if (!f.func)
			Object.defineProperty(f, 'func', {value: FunctionValue(f, frame)});
		frame.vars[propname].assign(f.func);
	});
}

function callOrNew(recurse, frame) {
	var funs = recurse(this.callee);
	var args = [];
	this.arguments.forEach(function (arg) {
		args.push(recurse(arg));
	});
	var thisVal = new Reference();
	var ret = {retVal: new Reference(), throwVal: new Reference()};
	if (this.type === 'CallExpression') {
		if (this.callee.type === 'MemberExpression') {
			thisVal = recurse(this.callee.object);
		} else {
			// thisVal should be the global object
			while (frame.parent)
				frame = frame.parent;
			thisVal = new Reference(frame.thisVal);
		}
	} else { // NewExpression
		if (!funs.length) {
			return ret;
		} else {
			// FIXME: we only consider the first protoype of the first possible object
			thisVal.assign(new Value({proto: funs[0].get('prototype')[0]}));
			thisVal[0].set('constructor', funs[0]);
		}
	}
	var self = this;
	funs.forEach(function (fun) {
		var functionReturn = fun.evaluateCall(thisVal, args, self.type);
		ret.retVal.assign(functionReturn.retVal);
		ret.throwVal.assign(functionReturn.throwVal);
	});
	if (this.type === 'NewExpression')
		ret.retVal = thisVal;
	return ret;
}

function plusExpression(left, right) {
	var str = stdlib.newString();
	var num = stdlib.newNumber();
	var bool = stdlib.newBoolean();
	var numbool = new Reference(num);
	numbool.assign(bool);
	var val = new Reference();
	// number + boolean = number
	// number + anything else = string

	if (left.contains(num) && right.contains(num))
		val.assign(num); // if BOTH sides contain a number, val can be a number
	if (numbool.contains(left) && numbool.contains(right))
		return num; // both sides are number and/or boolean -> val must be a number
	val.assign(str);
	return val;
}

function getExactPropname(recurse, astNode) {
	if (!astNode.computed) {
		return astNode.property.name;
	} else {
		// try if the property may lead to a knownvalue?
		var prop = recurse(astNode.property);
		if (prop.length == 1 && prop[0].knownvalue !== undefined) {
			return prop[0].knownvalue;
		}
		if (prop.length == 1)
			return {typeof: prop[0].typeof};
		return {};
	}
}

function doAssignment(recurse, leftAst, assign) {
	if (leftAst.type !== 'MemberExpression') {
		var left = recurse(leftAst);
		left.assign(assign);
		return left;
	}
	// MemberExpression
	var objs = recurse(leftAst.object);
	var self = leftAst;
	var value = new Reference();
	objs.forEach(function (obj) {
		var exactProp = getExactPropname(recurse, self);
		if (typeof exactProp !== 'object')
			value.assign(obj.set(exactProp, assign));
		else {
			value.assign(obj.setGeneric(assign, exactProp.typeof));
		}
	});
	return value;
}

evaluate = module.exports = function (astNode, frame) {
	// if there is no frame yet, create a new one with the globals defined and
	// the top scope references as `this` object
	if (!frame) {
		stdlib = stdlibInit(evaluate, astNode.filename);
		frame = {vars: {}, allFunctions: []};
		for (var k in stdlib.stdlib) {
			frame.vars[k + '-'] = stdlib.stdlib[k];
		}
		// `this` is the global object
		var thisVal = new Value();
		thisVal.properties = frame.vars; // should take care of assignment
		frame.thisVal = thisVal;
		Object.defineProperty(astNode, 'frame', {value: frame});
	}
	// hoist declarations to the top of the scope
	hoistDeclarations(astNode, frame);

//	if (!astNode.frame)
//		Object.defineProperty(astNode, 'frame', {value: frame});
	
	frame.retVal = new Reference();
	frame.throwVal = new Reference();
	walker(astNode, {
		AssignmentExpression: function (recurse) {
			var right = recurse(this.right);
			switch (this.operator) {
			case '=':
				return doAssignment(recurse, this.left, right);
			case '+=':
				var left = recurse(this.left);
				return doAssignment(recurse, this.left, plusExpression(left, right));
			case '-=':
			case '*=':
			case '/=':
			case '%=':
			case '<<=':
			case '>>=':
			case '>>>=':
			case '&=':
			case '^=':
			case '|=':
				return doAssignment(recurse, this.left, stdlib.newNumber());
			default:
				throw new Error('assignment operator ' + this.operator + ' not handled yet');
			}
		},
		ArrayExpression: function (recurse) {
			var val = stdlib.newArray();
			var arr = val[0];
			this.elements.forEach(function (prop, index) {
				arr.set(index, recurse(prop));
			});
			arr.set('length', stdlib.newNumber(this.elements.length));
			return new Reference(val);
		},
		BinaryExpression: function (recurse) {
			switch (this.operator) {
			case '+':
				return plusExpression(recurse(this.left), recurse(this.right));
			case '==':
			case '===':
			case '!=':
			case '!==':
			case '<=':
			case '<':
			case '>=':
			case '>':
			case 'instanceof':
			case 'in':
				recurse(this.left);
				recurse(this.right);
				return stdlib.newBoolean();
			case '|':
			case '&':
			case '^':
			case '-':
			case '*':
			case '/':
			case '%':
			case '<<':
			case '>>':
			case '>>>':
				recurse(this.left);
				recurse(this.right);
				return stdlib.newNumber();
			default:
				throw new Error('binary operator ' + this.operator + ' not handled yet');
			}
		},
		CallExpression: function (recurse) {
			var ret = callOrNew.call(this, recurse, frame);
			frame.throwVal.assign(ret.throwVal);
			return ret.retVal;
		},
		ConditionalExpression: function (recurse) {
			var test = recurse(this.test);
			var consequent = recurse(this.consequent);
			var alternate = recurse(this.alternate);
			if (test.isTruthy())
				return consequent;
			if (test.isFalsy())
				return alternate;
			var val = new Reference();
			val.assign(consequent);
			val.assign(alternate);
			return val;
		},
		FunctionDeclaration: function (recurse) {},
		FunctionExpression: function (recurse) {
			if (!this.func)
				Object.defineProperty(this, 'func', {value: FunctionValue(this, frame)});
			return this.func;
		},
		Identifier: function (recurse) {
			var currentFrame = frame;
			var propname = this.name + '-';
			while (!(propname in currentFrame.vars) && currentFrame.parent) {
				currentFrame = currentFrame.parent;
			}

			return currentFrame.vars[propname] = currentFrame.vars[propname] || new Reference();
		},
		Literal: function (recurse) {
			var self = this;
			var table = {
				'string': stdlib.newString,
				'number': stdlib.newNumber,
				'boolean': stdlib.newBoolean,
				'object': function () {
					if (self.value instanceof RegExp)
						return stdlib.newRegExp();
					else
						return stdlib.newObject();
				}
			};
			var newVal = table[typeof this.value]();
			newVal[0].knownvalue = this.value;
			return newVal;
		},
		LogicalExpression: function (recurse) {
			var left = recurse(this.left);
			var right = recurse(this.right);
			var val = new Reference();
			switch (this.operator) {
			case '&&':
				if (left.isFalsy())
					return left;
				if (left.isTruthy())
					return right;
				val.assign(left);
				val.assign(right);
				return val;
			case '||':
				if (left.isTruthy())
					return left;
				if (left.isFalsy())
					return right;
				val.assign(left);
				val.assign(right);
				return val;
			default:
				throw new Error('logical operator ' + this.operator + ' not handled yet');
			}
		},
		MemberExpression: function (recurse) {
			var value = new Reference();
			var objs = recurse(this.object);
			
			// FIXME: this should be done a bit cleaner
			if (!this.object.val)
				Object.defineProperty(this.object, 'val', {value: new Reference()});
			this.object.val.assign(objs);
			
			var self = this;
			objs.forEach(function (obj) {
				var exactProp = getExactPropname(recurse, self);
				if (exactProp === 'prototype') {
					var proto = obj.get('prototype', true);
					if (!proto.length)
						obj.set('prototype', stdlib.newObject());
				}
				value.assign(typeof exactProp !== 'object'
					? obj.get(exactProp)
					: obj.getGeneric(exactProp.typeof));
			});
			return value;
		},
		NewExpression: function (recurse) {
			var ret = callOrNew.call(this, recurse);
			frame.throwVal.assign(ret.throwVal);
			return ret.retVal;
		},
		ObjectExpression: function (recurse) {
			var val = stdlib.newObject();
			var obj = val[0];
			this.properties.forEach(function (prop) {
				obj.set(prop.key.name || prop.key.value, recurse(prop.value));
			});
			return new Reference(val);
		},
		ReturnStatement: function (recurse) {
			frame.retVal.assign(recurse(this.argument));
		},
		ThisExpression: function (recurse) {
			return frame.thisVal;
		},
		ThrowStatement: function (recurse) {
			frame.throwVal.assign(recurse(this.argument));
		},
		TryStatement: function (recurse) {
			// record all the throws from this block separately
			var oldThrow = frame.throwVal;
			frame.throwVal = new Reference();
			recurse(this.block);
			var throwVal = frame.throwVal;
			frame.throwVal = oldThrow;
			
			// FIXME: there is really just one handler in standard ES5
			var catchclause = this.handlers[0];
			// make a new frame for the `CatchClause` to avoid the param to overwrite
			// local variables
			var catchFrame = {vars: {}, thisVal: frame.thisVal, parent: frame};
			var propname = catchclause.param.name + '-';
			catchFrame.vars[propname] = throwVal;
			evaluate(catchclause.body, catchFrame);
			frame.retVal.assign(catchFrame.retVal);
			frame.throwVal.assign(catchFrame.throwVal);
			
			// new variable declarations are pushed to the outer frame
			for (var prop in catchFrame.vars) {
				if (prop === propname)
					continue;
				frame.vars[prop] = frame.vars[prop] || new Reference();
				frame.vars[prop].assign(catchFrame.vars[prop]);
			}
			
			recurse(this.finalizer);
		},
		UnaryExpression: function (recurse) {
			var arg = recurse(this.argument);
			switch (this.operator) {
			case 'typeof':
				var val = stdlib.newString();
				if (arg.length == 1)
					val[0].knownvalue = arg[0].typeof;
				return val;
			case 'void':
				return new Reference();
			case 'delete':
				return stdlib.newBoolean();
			case '+':
			case '-':
			case '~':
				return stdlib.newNumber();
			case '!':
				if (arg.length && arg.every(function (val) { return val.isTruthy(); }))
					return stdlib.newBoolean(false);
				else if (arg.length && arg.every(function (val) { return val.isFalsy(); }))
					return stdlib.newBoolean(true);
				else
					return stdlib.newBoolean();
			default:
				throw new Error('unary operator ' + this.operator + ' not handled yet');
			}
		},
		UpdateExpression: function (recurse) {
			var arg = recurse(this.argument);
			arg.assign(stdlib.newNumber());
			return stdlib.newNumber();
		},
		VariableDeclaration: function (recurse) {
			this.declarations.forEach(function (decl) {
				var ref = frame.vars[decl.id.name + '-'] = new Reference();
				if (!decl.init)
					return;
				var init = recurse(decl.init);
				ref.assign(init);
			});
		},
		WithStatement: function (recurse) {
			throw new Error('with() is not supported');
		}
	});
	if (!frame.parent && frame.allFunctions) { // global frame
		// call all the functions at least once so we have local variable binding
		// to use for completion
		for (var i = 0; i < frame.allFunctions.length; i++) {
			var fun = frame.allFunctions[i];
			fun.forEach(function (fun) {
				if (fun.transfer)
					return;
				fun.evaluateCall(new Reference(), [], 'CallExpression');
			});
		}
	}
	return frame;
}
