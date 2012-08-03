var findDeclarations = require('../finddeclarations');

exports.DeclarationBinding = DeclarationBinding;
exports.CreateArgumentsObject = CreateArgumentsObject;

// 10.5
function DeclarationBinding(astNode, context, args) {
	var env = context.VariableEnvironment.record;
	var configurableBindings = false; // TODO
	var strict = false; // TODO
	var functionCode = ~['FunctionDeclaration','FunctionExpression'].indexOf(astNode.type);

	// 4. parameters
	if (functionCode) {
		var names = astNode.params;
		var argCount = args.length;
		for (var n = 0; n < names.length; n++) {
			var argName = names[n].name;
			var v = n >= argCount ? undefined : args[n];
			var argAlreadyDeclared = env.HasBinding(argName);
			if (!argAlreadyDeclared) {
					env.CreateMutableBinding(argName);
			}
			env.SetMutableBinding(argName, v, strict);
		}
	}

	// find the declarations in the function body
	var declarations = findDeclarations(functionCode ? astNode.body : astNode);
	// 5. functions
	for (var i in declarations.functions) {
		var f = declarations.functions[i];
		var fn = f.id.name;

		var fo = new this.FunctionValue(f, context.LexicalEnvironment, strict);

		var funcAlreadyDeclared = env.HasBinding(fn);
		if (!funcAlreadyDeclared) {
			env.CreateMutableBinding(fn, configurableBindings);
		} else if (context.global) {
			var go = context.ThisBinding;
			var existingProp = go.GetProperty(fn);
			if (existingProp.Configurable) {
				var desc = new PropertyDescriptor({
					Value: undefined,
					Writable: true,
					Enumerable: true,
					Configurable: configurableBindings});
				go.DefineOwnProperty(fn, desc, true);
			} // TODO: else if: 5.e.iv
		}
		env.SetMutableBinding(fn, fo, strict);
	}
	
	var argumentsAlreadyDeclared = env.HasBinding('arguments');
	// 7. arguments
	if (functionCode && !argumentsAlreadyDeclared) {
		var func = context.func; // FIXME
		var argsObj = this.CreateArgumentsObject(func, names, args, env, strict);
		if (strict) {
			// TODO
		} else {
			env.CreateMutableBinding('arguments');
			env.SetMutableBinding('arguments', argsObj, false);
		}
	}
	
	// 8. variables
	for (var i in declarations.variables) {
		var d = declarations.variables[i];
		var dn = d.id.name;
		var varAlreadyDeclared = env.HasBinding(dn);
		if (!varAlreadyDeclared) {
			env.CreateMutableBinding(dn, configurableBindings);
			env.SetMutableBinding(dn, this.undefined, strict);
		}
	}
}

function CreateArgumentsObject(func, names, args, env, strict) {
	var len = args.length;
	var obj = new this.ObjectValue();
	obj.Class = 'Arguments';
	// TODO: Prototype
	//obj.Prototype = ...;
	obj.DefineOwnProperty('length', new this.PropertyDescriptor({
		Value: new this.NumberValue(len),
		Writable: true,
		Enumerable: false,
		Configurable: true
	}), false);
	// TODO: ...
	return obj;
}
