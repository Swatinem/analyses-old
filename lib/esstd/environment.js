exports.DeclarativeEnvironment = DeclarativeEnvironment;
exports.LexicalEnvironment = LexicalEnvironment;
exports.GetIdentifierReference = GetIdentifierReference;
exports.NewDeclarativeEnvironment = NewDeclarativeEnvironment;
exports.NewObjectEnvironment = NewObjectEnvironment;
exports.ExecutionContext = ExecutionContext;

exports.dynamic = {ObjectEnvironment: ObjectEnvironment};

var copy = require('../utils').copy;

// 10.2.1.1
// TODO: non-deletable bindings
// TODO: immutable bindings
function DeclarativeEnvironment() {
	this.bindings = {};
}
DeclarativeEnvironment.prototype = {
	_name: function (N) {
		return N + '-';
	},
	// 10.2.1.1.1
	HasBinding: function (N) {
		return (this._name(N) in this.bindings);
	},
	// 10.2.1.1.2
	CreateMutableBinding: function (N, D) {
		// assert(!this.HasBinding(N));
		this.bindings[this._name(N)] = undefined;
	},
	// 10.2.1.1.3
	SetMutableBinding: function (N, V, S) {
		// assert(this.HasBinding(N));
		// TODO: immutable binding?
		this.bindings[this._name(N)] = V;
	},
	// 10.2.1.1.4
	GetBindingValue: function (N, S) {
		return this.bindings[this._name(N)];
	},
	// 10.2.1.1.5
	DeleteBinding: function (N) {
		if (!this.HasBinding(N))
			return true;
		// TODO: non-deletable
		delete this.bindings[this._name(N)];
		return true;
	},
	// 10.2.1.1.6
	ImplicitThisValue: function () {
		return undefined;
	},
	// 10.2.1.1.7
	CreateImmutableBinding: function (N) {
		// assert(!this.HasBinding(N));
		// TODO: immutable
		this.bindings[this._name(N)] = undefined;
	},
	// 10.2.1.1.8
	InitializeImmutableBinding: function (N, V) {
		// assert(this.HasBinding(N));
		// TODO: record initialized
		this.bindings[this._name(N)] = V;
	},
};


// 10.2.1.2
function ObjectEnvironment(g, object) {
	Object.defineProperty(this, 'g', {value: g});
	//this.g = g; // globals
	this.object = object;
}
// FIXME: rewrite everything once I rewrite the objects
ObjectEnvironment.prototype = {
	toString: function () {
		return this.object.toString();
	},
	// 10.2.1.2.1
	HasBinding: function (N) {
		return this.object.HasProperty(N);
	},
	// 10.2.1.2.2
	CreateMutableBinding: function (N, D) {
		// assert(!this.object.HasProperty(N))
		var configValue = D;
		//FIXME:
		configValue = true;
		var desc = new this.g.PropertyDescriptor({
			Value: undefined,
			Writable: true,
			Enumerable: true,
			Configurable: configValue});
		this.object.DefineOwnProperty(N, desc, true);
	},
	// 10.2.1.2.3
	SetMutableBinding: function (N, V, S) {
		this.object.Put(N, V, S);
	},
	// 10.2.1.2.4
	GetBindingValue: function (N, S) {
		var value = this.object.HasProperty(N);
		if (!value) {
			// TODO: 4.a
		}
		return this.object.Get(N);
	},
	// 10.2.1.2.5
	DeleteBinding: function (N) {
		return this.object.Delete(N);
	},
	// 10.2.1.2.6
	ImplicitThisValue: function () {
		return this.provideThis && this.object;
	},
};

function LexicalEnvironment(outer, record) {
	this.outer = outer;
	this.record = record;
}
LexicalEnvironment.prototype.toString = function () {
	return this.record.toString() + (this.outer && this.outer.toString() || '');
};

// 10.2.2.1
function GetIdentifierReference(lex, name, strict) {
	if (!lex) {
		return new this.Reference(undefined, name, strict);
	}
	var envRec = lex.record;
	var exists = envRec.HasBinding(name);
	if (exists) {
		return new this.Reference(envRec, name, strict);
	} else {
		var outer = lex.outer;
		return this.GetIdentifierReference(outer, name, strict);
	}
}

// 10.2.2.2
function NewDeclarativeEnvironment(E) {
	var envRec = new this.DeclarativeEnvironment();
	var env = new this.LexicalEnvironment(E, envRec);
	return env;
}

// 10.2.2.3
function NewObjectEnvironment(O, E) {
	var envRec = new this.ObjectEnvironment(O);
	var env = new this.LexicalEnvironment(E, envRec);
	return env;

}

// 10.3
function ExecutionContext(LexicalEnvironment, VariableEnvironment, ThisBinding, /*FIXME:*/globalObject) {
	this.LexicalEnvironment = LexicalEnvironment;
	this.VariableEnvironment = VariableEnvironment;
	this.ThisBinding = ThisBinding;
	this.globalObject = globalObject;
}
ExecutionContext.prototype = {
	toString: function () {
		return this.LexicalEnvironment.toString();
	},
	copy: function () {
		return copy(this, ['Code' ,'g']);
	}
};
