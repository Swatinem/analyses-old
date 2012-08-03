var debug = require('debug')('evaluate');

module.exports = evaluate;

function evaluate(astNode, g /* globals */) {
	var context = g.context;
	function recurse(node) {
		return evaluate(node, g);
	}
	switch (astNode.type) {
		// 11.1.1
		case 'ThisExpression':
			return context.ThisBinding;

		// 11.1.5
		case 'ObjectExpression':
			// TODO: Prototype, etc
			var o = new g.ObjectValue();
			astNode.properties.forEach(function (prop) {
				var propName = prop.key.name;
				var desc;
				if (prop.kind == 'init') {
					var exprValue = recurse(prop.value);
					var propValue = g.GetValue(exprValue);
					desc = new g.PropertyDescriptor({Value: propValue, Writable: true, Enumerable: true, Configurable: true});
				}
				o.DefineOwnProperty(propName, desc, false);
			});
			return o;

		// 11.2.1
		case 'MemberExpression':
			var baseReference = recurse(astNode.object);
			var baseValue = g.GetValue(baseReference);
			/* per standard:
			var propertyNameReference = recurse(this.property);
			var propertyNameValue = GetValue(propertyNameReference);
			// TODO: CheckObjectCoercible(baseValue)
			var propertyNameString = ToString(propertyNameValue);
			return new Reference(baseValue, propertyNameString, strict);
			*/
			
			var strict = false; // FIXME
			if (!(baseValue instanceof g.MultiValue)) {
				var oldValue = baseValue;
				baseValue = new g.MultiValue();
				baseValue.push(oldValue);
			}

			// here is where the code completion comes into play: we record every
			// baseValue that ever came through this MemberExpression
			if (!astNode.object.Value)
				Object.defineProperty(astNode.object, 'Value', {value: new g.MultiValue()});
			astNode.object.Value.push(baseValue);

			var ref = new g.MultiReference();
			baseValue.forEach(function (base) {
				if (!astNode.computed) {
					ref.push(new g.Reference(base, astNode.property.name, strict));
				} else {
					var propertyNamesReference = recurse(astNode.property);
					var propertyNamesValue = g.GetValue(propertyNamesReference);
					//var propertyNamesString = ToString(propertyNamesValue);
					// string...
					// TODO
				}
			});
			if (ref.length === 1)
				return ref[0]; // keep it simple if possible
			return ref;

		// 11.2.2
		case 'NewExpression':
			var ref = recurse(astNode.callee);
			var constructor = g.GetValue(ref);
			var argList = astNode.arguments.map(recurse);
			// TODO: TypeError
			if (!constructor)
				return;
			if (!(constructor instanceof g.MultiValue))
				constructor = [constructor];
			var allret = new g.MultiValue();
			constructor.forEach(function (c) {
				// TODO: ret.throw
				var ret = c.Construct(argList);
				allret.push(ret.return);
			});
			return allret.length > 1 ? allret : allret[0];

		// 11.2.3
		case 'CallExpression':
			// TODO: MultiValue
			var ref = recurse(astNode.callee);
			var func = g.GetValue(ref);
			var argList = astNode.arguments.map(recurse);
			// TODO: TypeError
			var thisVal = undefined; // TODO: the object
			if (ref instanceof g.Reference) {
				if (ref.IsPropertyReference())
					thisVal = ref.base;
				else if (ref.base)
					thisVal = ref.base.ImplicitThisValue();
			}
			if (!func)
				return;
			if (!(func instanceof g.MultiValue))
				func = [func];
			var allret = new g.MultiValue();
			func.forEach(function (f) {
				// TODO: ret.throw
				var ret = f.Call(thisVal, argList);
				// FIXME: need a reference aware merge and replace function
				// FIXME: what about outer var references when we have `MultiValue`s?
				if (context.ThisBinding === context.globalObject) {
					context.ThisBinding = ret.globalObject;
					context.LexicalEnvironment.record.object = ret.globalObject;
				}
				context.globalObject = ret.globalObject;
				allret.push(ret.return);
			});
			return allret;

		// 11.4
		case 'UnaryExpression':
			switch (astNode.operator) {
				// 11.4.1
				case 'delete':
					var ref = recurse(astNode.argument);
					if (!(ref instanceof g.Reference))
						return new g.BooleanValue(true);
					if (ref.IsUnresolvableReference()) {
						// TODO: 3.a strict: throw SyntaxError
						return new g.BooleanValue(true);
					}
					if (ref.IsPropertyReference()) {
						return new g.BooleanValue(g.ToObject(ref.base).Delete(ref.name, ref.strict));
					} else {
						// TODO: 5.a strict: throw SyntaxError
						var bindings = ref.base;
						return new g.BooleanValue(bindings.DeleteBinding(ref.name));
					}

				// 11.4.2
				case 'void':
					var expr = recurse(astNode.argument);
					g.GetValue(expr);
					return g.undefined;

				// 11.4.3
				case 'typeof':
					// TODO: MultiReference, MultiValue and `any` support
					var val = recurse(astNode.argument);
					if (val instanceof g.Reference) {
						if (val.IsUnresolvableReference())
							return new g.StringValue('undefined');
						val = g.GetValue(val);
					}
					if (val instanceof g.FunctionValue)
						return new g.StringValue('function');
					if (val === g.null)
						return new g.StringValue('object');
					return new g.StringValue(val.Type.toLowerCase());

				// 11.4.4
				case '++':

				// 11.4.5
				case '--':

				// 11.4.6
				case '+':

				// 11.4.7
				case '-':

				// 11.4.8
				case '~':

					debug('unhandled unary operator: ' + astNode.operator);
					break;

				// 11.4.9
				case '!':
					var expr = recurse(astNode.argument);
					var oldValue = g.ToBoolean(g.GetValue(expr));
					if (oldValue.PrimitiveValue)
						return new g.BooleanValue(false);
					else if (typeof oldValue.PrimitiveValue !== 'undefined')
						return new g.BooleanValue(true);
					else
						return new g.BooleanValue();
			}

		// 11.11
		case 'LogicalExpression':
			switch (astNode.operator) {
				case '&&':
					var lref = recurse(astNode.left);
					var lval = g.GetValue(lref);
					var bool = g.ToBoolean(lval);
					if (typeof bool.PrimitiveValue !== 'undefined' && !bool.PrimitiveValue)
						return lval;
					else {
						var rref = recurse(astNode.right);
						var rval = g.GetValue(rref);
						if (bool.PrimitiveValue)
							return rval;
						// else
						var val = new g.MultiValue();
						val.push(lval);
						val.push(rval);
						return val;
					}
				case '||':
					var lref = recurse(astNode.left);
					var lval = g.GetValue(lref);
					var bool = g.ToBoolean(lval);
					if (bool.PrimitiveValue)
						return lval;
					else {
						var rref = recurse(astNode.right);
						var rval = g.GetValue(rref);
						if (typeof bool.PrimitiveValue !== 'undefined')
							return rval;
						// else
						var val = new g.MultiValue();
						val.push(lval);
						val.push(rval);
						return val;
					}
				default:
					debug('unhandled logical operator: ' + astNode.operator);
					break;
			}

		// 11.12
		case 'ConditionalExpression':
			var lref = recurse(astNode.test);
			var bool = g.ToBoolean(g.GetValue(lref));
			// true "branch" only:
			if (bool.PrimitiveValue)
				return g.GetValue(recurse(astNode.consequent));
			// false "branch" only:
			else if (typeof bool.PrimitiveValue !== 'undefined')
				return g.GetValue(recurse(astNode.alternate));
			// both true and false:
			else {
				var val = new g.MultiValue();
				val.push(g.GetValue(recurse(astNode.consequent)));
				val.push(g.GetValue(recurse(astNode.alternate)));
				return val;
			}

		// 11.13
		case 'AssignmentExpression':
			switch (astNode.operator) {
				case '=':
					var lref = recurse(astNode.left);
					var rref = recurse(astNode.right);
					var rval = g.GetValue(rref);
					// TODO: 4. SyntaxErrors
					g.PutValue(lref, rval);
					return rval;
				default:
					debug('unhandled assignment: ' + astNode.operator);
					break;
			}

		// 12.4
		case 'ExpressionStatement':
			var exprRef = recurse(astNode.expression);
			return g.GetValue(exprRef);

		// 12.9
		case 'ReturnStatement':
			if (!context.return)
				context.return = new g.MultiValue();
			if (!astNode.argument)
				return context.return.push(g.undefined);
			// else
			var exprRef = recurse(astNode.argument);
			return context.return.push(g.GetValue(exprRef));

		// 13
		case 'FunctionExpression':
			if (astNode.id) {
				var funcEnv = g.NewDeclarativeEnvironment(context.LexicalEnvironment);
				var envRec = funcEnv.record;
				envRec.CreateImmutableBinding(astNode.id.name);
				var closure = new g.FunctionValue(astNode, funcEnv, false);
				envRec.InitializeImmutableBinding(astNode.id.name, closure);
				return closure;
			} else {
				return new g.FunctionValue(astNode, context.LexicalEnvironment, false); // TODO: strict mode?
			}

		// 8.7
		case 'Literal':
			switch (typeof astNode.value) {
				case 'boolean': // 7.8.2
					return new g.BooleanValue(astNode.value);
				case 'number': // 7.8.3
					return new g.NumberValue(astNode.value);
				case 'string': // 7.8.4
					return new g.StringValue(astNode.value);
				case 'object':
					if (astNode.value === null)
						return g.null; // 7.8.1
					debug('unhandled RegExp literal' + astNode.value);
					break;
					// TODO: 7.8.5
			}

		// 10.3.1
		case 'Identifier':
			var env = context.LexicalEnvironment;
			var strict = false; // FIXME
			return g.GetIdentifierReference(env, astNode.name, strict);

		// 12.2
		case 'VariableDeclaration':
			astNode.declarations.forEach(function (decl) {
				recurse(decl);
			});
			break;
		case 'VariableDeclarator':
			if (!astNode.init)
				return astNode.id.name;
			var lhs = recurse(astNode.id);
			var rhs = recurse(astNode.init);
			var value = g.GetValue(rhs);
			g.PutValue(lhs, value);
			return astNode.id.name;

		default:
			debug('unhandled ', astNode.type);
			break;
	}
}
