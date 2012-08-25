exports.PropertyDescriptor = PropertyDescriptor;
exports.MultiValue = MultiValue;
exports.IsDataDescriptor = IsDataDescriptor;

exports.Value = Value;
exports.StringValue = StringValue;
exports.BooleanValue = BooleanValue;
exports.NumberValue = NumberValue;
exports.ObjectValue = ObjectValue;
//exports.FunctionValue = FunctionValue;

exports.dynamic = {FunctionValue: FunctionValue};

var ControlFlowGraph = require('../').ControlFlowGraph;
var utils = require('../utils');
var extend = utils.extend;
var equals = utils.equals;
var Set = utils.Set;

/**
 * Similar to MultiReference, a Value may have multiple values as well, hence
 * MultiValue
 */
function MultiValue() {
	Set.call(this);
}
MultiValue.prototype = Object.create(Set.prototype);
extend(MultiValue.prototype, {
	toString: function () {
		return '[' + this.map(function (p) { return p || 'any'; }).join(', ') + ']';
	},
	push: function (V) {
		if (V instanceof MultiValue) {
			V.forEach(Set.prototype.push.bind(this));
			return this;
		}
		// else
		return Set.prototype.push.call(this, V);
	}
});


// 8
function Value(type) {
	this.Type = type || 'Undefined';
}
Value.prototype = {
	equals: function (that) {
		return that && this.Type !== 'Object' &&
			this.Type == that.Type && this.PrimitiveValue === that.PrimitiveValue;
	},
	toString: function () {
		return this.Type.toLowerCase() + (this.PrimitiveValue !== undefined ? ':' + this.PrimitiveValue : '');
	}
};

// 8.1
var undefinedValue = exports.undefined = new Value();

var nullValue = exports.null = new Value('Null');

// 8.3
function BooleanValue(PrimitiveValue) {
	Value.call(this, 'Boolean');
	this.PrimitiveValue = PrimitiveValue;
}
BooleanValue.prototype = Object.create(Value.prototype);

// 8.4
function StringValue(PrimitiveValue) {
	Value.call(this, 'String');
	this.PrimitiveValue = PrimitiveValue;
}
StringValue.prototype = Object.create(Value.prototype);
StringValue.prototype.toString = function () {
	return 'string' + (this.PrimitiveValue !== undefined ? ':"' + this.PrimitiveValue + '"' : '')
}

// 8.5
function NumberValue(PrimitiveValue) {
	Value.call(this, 'Number');
	this.PrimitiveValue = PrimitiveValue;
}
NumberValue.prototype = Object.create(Value.prototype);

// 8.6
function ObjectValue(Prototype) {
	Value.call(this, 'Object');
	this.Prototype = Prototype;
	this.Extensible = true; // TODO
	this.properties = {};
	/*
	this.Class;
	this.Extensible;
	CanPut
	DefaultValue
	PrimitiveValue
	Construct
	Call
	HasInstance
	Scope
	FormalParameters
	Code
	TargetFunction
	BoundThis
	BoundArguments
	Match
	ParameterMap
	*/
}
// TODO: this should work with property descriptors throughout
ObjectValue.prototype = Object.create(Value.prototype);
extend(ObjectValue.prototype, {
	toString: function () {
		var props = this.properties;
		return '{' + Object.keys(props).sort().map(function (k) {
			if (k == 'constructor-')
				return '"constructor": [Cycle]'; // we have a cycle here most probably…
			return '"' + k.substring(0, k.length - 1) + '": ' +
				(props[k].Value && props[k].Value.toString() || 'any');
		}).filter(function (p) { return p; }).join(', ') + '}';
	},
	_name: function (N) {
		return N + '-';
	},
	
	// 8.12.1
	GetOwnProperty: function (P) {
		var name = this._name(P);
		if (!(name in this.properties))
			return undefined;
		return this.properties[name];
	},
	// 8.12.2
	GetProperty: function (P) {
		var prop = this.GetOwnProperty(P);
		if (prop)
			return prop;
		var proto = this.Prototype;
		if (!proto)
			return undefined;
		return proto.GetProperty(P);
	},
	// 8.12.3
	Get: function (P) {
		var desc = this.GetProperty(P);
		if (!desc)
			return undefined;
		if (IsDataDescriptor(desc))
			return desc.Value;
		// else: accessor
		var getter = desc.Get;
		if (!getter)
			return undefined;
		return getter.Call(O, []);
	},
	// 8.12.4
	CanPut: function (P) {
		var desc = this.GetOwnProperty(P);
		if (desc) {
			if (IsAccessorDescriptor(desc))
				return !!desc.Set;
			// else
			return desc.Writable;
		}
		// else
		var proto = this.Prototype;
		if (!proto)
			return this.Extensible;
		var inherited = proto.GetProperty(P);
		if (!inherited)
			return this.Extensible;
		if (IsAccessorDescriptor(inherited))
			return !!inherited.Set;
		// else
		return this.Extensible && inherited.Writable;
	},
	// 8.12.5
	Put: function (P, V, Throw) {
		if (!this.CanPut(P)) {
			// TODO: TypeError
			//return; FIXME: ignore this for now
		}
		var ownDesc = this.GetOwnProperty(P);
		if (IsDataDescriptor(ownDesc)) {
			var valueDesc = new PropertyDescriptor({Value: V});
			this.DefineOwnProperty(P, valueDesc, Throw);
			return;
		}
		var desc = this.GetProperty(P);
		if (IsAccessorDescriptor(desc)) {
			var setter = desc.Set;
			setter.Call(O, [V]);
		} else {
			var newDesc = new PropertyDescriptor({
				Value: V,
				Writable: true,
				Enumerable: true,
				Configurable: true
			});
			this.DefineOwnProperty(P, newDesc, Throw);
		}
	},
	// 8.12.6
	HasProperty: function (P) {
		var desc = this.GetProperty(P);
		return !!desc;
	},
	// 8.12.7
	Delete: function (P, Throw) {
		var desc = this.GetOwnProperty(P);
		if (!desc)
			return true;
		if (desc.Configurable) {
			delete this.properties[this._name(P)];
			return true;
		}
		// TODO: TypeError
		return false;
	},
	// TODO: 8.12.8: [[DefaultValue]] (hint)
	// 8.12.9
	DefineOwnProperty: function (P, Desc, Throw) {
		// TODO: Reject
		var current = this.GetOwnProperty(P);
		var extensible = this.Extensible;
		if (!current && !extensible)
			return false;
		if (!current && extensible) {
			this.properties[this._name(P)] = Desc;
			return true;
		}
		// else:
		if (equals(Desc, current))
			return true;
		if (!current.Configurable) {
			if (Desc.Configurable)
				return false; // Reject
			if (Desc.Enumerable != Desc.Enumerable)
				return false; // Reject
		}
		// TODO: GenericDescriptor
		if (IsDataDescriptor(current) != IsDataDescriptor(Desc)) { // 9.
			if (!current.Configurable)
				return false; // Reject
			// TODO preserve [[Configurable]] and [[Enumerable]]
			this.properties[this._name(P)] = Desc;
			return true;
		}
		else if (IsDataDescriptor(current) && IsDataDescriptor(Desc)) { // 10.
			if (!current.Configurable) {
				if (!current.Writable && Desc.Writable)
					return false; // Reject;
				// TODO: SameValue on Value
				//if (!current.Writable && )
			} else {
				this.properties[this._name(P)] = Desc;
			}
		} else { // 11.
			if (!current.Configurable) {
				// TODO: SameValue on Set, Get
			}
		}
		this.properties[this._name(P)] = Desc;
		return true;
	},
});

// 13.2
function FunctionValue(g, astNode, Scope, strict) {
	this.g = g;
	// TODO: Prototype 15.3.3.1
	ObjectValue.call(this/*, Prototype*/);
	var F = this;

	F.Scope = Scope;
	// TODO: formal parameters?
	F.Code = astNode;
	F.Extensible = true;
	var len = new NumberValue(astNode.params.length);
	F.DefineOwnProperty('length', new PropertyDescriptor({
		Value: len,
		Writable: false,
		Enumerable: false,
		Configurable: false
	}), false);
	var proto = new ObjectValue();
	proto.DefineOwnProperty('constructor', new PropertyDescriptor({
		Value: F,
		Writable: true,
		Enumerable: false,
		Configurable: true
	}), false);
	F.DefineOwnProperty('prototype', new PropertyDescriptor({
		Value: proto,
		Writable: true,
		Enumerable: false,
		//Configurable: false
		Configurable: true // FIXME
	}), false);
	/* TODO:
	if (strict)
	*/
}
FunctionValue.prototype = Object.create(ObjectValue.prototype);
extend(FunctionValue.prototype, {
	Class: 'Function',
	// 15.3.5.4
	Get: function (P) {
		// TODO: TypeError
		return ObjectValue.prototype.Get.call(this, P);
	},
	// 13.2.1
	Call: function (thisVal, argList) {
		var globals = this.g;
		// late initiate to avoid circular dependency and thus broken code

		// 10.4.3
		if (!thisVal)
			thisVal = globals.context.globalObject;
		var localEnv = globals.NewDeclarativeEnvironment(this.Scope);
		var funcCtx = new globals.ExecutionContext(localEnv, localEnv, thisVal, globals.context.globalObject);
		funcCtx.func = this; // FIXME
		globals.DeclarationBinding(this.Code, funcCtx, argList);
		
		var oldContext = globals.context;
		globals.context = funcCtx;
		var cfg = this.Code.cfg = this.Code.cfg || ControlFlowGraph(this.Code.body);
		globals.typeInference(cfg, globals);
		globals.context = oldContext;
		
		var returnContext = cfg[1].output[0];
		return returnContext;
	},
	// TODO: 13.2.2
	Construct: function (argList) {
		var proto = this.Get('prototype');
		// TODO: 7. proto not Object
		var obj = new this.g.ObjectValue(proto);
		var result = this.Call(obj, argList);
		if (!(result.return && result.return.length == 1 && result.return[0] instanceof ObjectValue))
			result.return = result.ThisBinding;
		return result;
	},
	// TODO: 15.3.5.3
	HasInstance: function () {},
});

// 8.6.1
function PropertyDescriptor(options) {
	// FIXME:
	this.Enumerable = true;
	this.Configurable = true;
	for (var key in options || {}) {
		this[key] = options[key];
	}
}

// 8.10.1
function IsAccessorDescriptor(Desc) {
	if (!Desc)
		return false;
	if (!Desc.Get && !Desc.Set)
		return false;
	return true;
}

// 8.10.2
function IsDataDescriptor(Desc) {
	if (!Desc)
		return false;
	if (!Desc.Value && !Desc.Writable)
		return false;
	return true;
}

// TODO: 8.10.3 - 8.10.5
