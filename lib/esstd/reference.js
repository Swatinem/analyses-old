var Set = require('../utils').Set;

//exports.Reference = Reference;
exports.MultiReference = MultiReference;
exports.GetValue = GetValue;
exports.PutValue = PutValue;
exports.dynamic = {Reference: Reference};

/**
 * Since we do not work exactly, a Reference can have multiple base values
 * and even multiple name values, thus we need a MultiReference
 */
function MultiReference() {
	Set.call(this);
}
MultiReference.prototype = Object.create(Set.prototype);


// 8.7
function Reference(g, base, name, strict) {
	this.g = g; // globals
	this.base = base;
	this.name = name;
	this.strict = strict;
}

Reference.prototype = {
	equals: function (that) {
		return this.base === that.base && this.name === that.name && this.strict === that.strict;
	},
	// 8.7
	HasPrimitiveBase: function () {
		var g = this.g;
		return this.base instanceof g.NumberValue || this.base instanceof g.StringValue || this.base instanceof g.BooleanValue;
	},
	// 8.7
	IsPropertyReference: function () {
		// FIXME
		var g = this.g;
		return this.base instanceof g.ObjectValue || this.HasPrimitiveBase();
	},
	// 8.7
	IsUnresolvableReference: function () {
		return !this.base;
	},
};

// 8.7.1
function GetValue(V) {
	var g = this;
	if (V instanceof g.MultiReference) {
		var val = new g.MultiValue();
		V.forEach(function (ref) {
			val.push(g.GetValue(ref));
		});
		return val;
	}
	
	if (!(V instanceof g.Reference)) {
		return V;
	}
	var base = V.base;
	// TODO: ReferenceError
	if (!base)
		return undefined;
	if (V.IsPropertyReference()) {
		var get;
		if (!V.HasPrimitiveBase()) {
			get = base.Get;
		} else {
			get = function (P) {
				var base = this;
				var O = g.ToObject(base);
				var desc = O.GetProperty(P);
				if (!desc)
					return undefined;
				if (g.IsDataDescriptor(desc)) {
					return desc.Value;
				} else {
					var getter = desc.Get;
					if (!getter)
						return undefined;
					return getter.Call(base);
				}
			};
		}
		return get.call(base, V.name);
	} else {
		return base.GetBindingValue(V.name, V.strict);
	}
}
// 8.7.2
function PutValue(V, W) {
	var g = this;
	if (V instanceof g.MultiReference) {
		V.forEach(function (ref) {
			g.PutValue(ref, W);
		});
		return;
	}
	// TODO: ReferenceError
	var base = V.base;
	if (V.IsUnresolvableReference()) {
		if (V.strict) { // TODO: ReferenceError
		} else {
			g.context.globalObject.Put(V.name, W, false);
		}
	} else if (V.IsPropertyReference()) {
		var put;
		if (!V.HasPrimitiveBase()) {
			put = base.Put;
		} else {
			put = function (P, W, Throw) {
				var base = this;
				var O = g.ToObject(base);
				if (!O.CanPut(P)) {
					// TODO: 2.a throw TypeError
					return;
				}
				var ownDesc = O.GetOwnProperty(P);
				if (g.IsDataDescriptor(ownDesc)) {
					// TODO: 4.a throw TypeError
					return;
				}
				var desc = O.GetProperty(P);
				if (IsAccessorDescriptor(desc)) {
					var setter = desc.Set;
					setter.Call(base, [W]);
				} else if (Throw) {
					// TODO: 7.a throw TypeError
				}
				return;
			};
		}
		put.call(base, V.name, W, V.strict);
	} else {
		base.SetMutableBinding(V.name, W, V.strict);
	}
}
