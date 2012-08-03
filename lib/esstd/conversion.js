exports.ToBoolean = ToBoolean;
exports.ToObject = ToObject;

// 9.1
function ToPrimitive() {
}

// 9.2
function ToBoolean(V) {
	var g = this;
	V = g.GetValue(V);
	if (V instanceof this.MultiValue) {
		// true if EVERY value is true
		if (V.every(function (v) {
				var bool = g.ToBoolean(v);
				return bool.PrimitiveValue;
			}))
			return new g.BooleanValue(true);
		// or false if EVERY value is false
		else if (V.every(function (v) {
				var bool = g.ToBoolean(v);
				return typeof bool.PrimitiveValue !== 'undefined' && !bool.PrimitiveValue;
			}))
			return new g.BooleanValue(false);
		// or either true or false
		else
			return new g.BooleanValue();
	}
	if (!V || !V.Type || (!~['Undefined', 'Object', 'Null'].indexOf(V.Type) && typeof V.PrimitiveValue === 'undefined'))
		return new g.BooleanValue(); // can be both true or false
	switch (V.Type) {
		case 'Undefined':
			return new g.BooleanValue(false);
		case 'Null':
			return new g.BooleanValue(false);
		case 'Boolean':
			return V;
		case 'Number':
			return new g.BooleanValue((!V.PrimitiveValue || isNaN(V.PrimitiveValue)) ? false : true);
		case 'String':
			return new g.BooleanValue(V.PrimitiveValue.length !== 0);
		case 'Object':
			return new g.BooleanValue(true);
	}
}

// 9.3
function ToNumber() {
}

// 9.8
function ToString() {
}

// 9.9
function ToObject(V) {
	return V;
}

// 9.10
function CheckObjectCoercible() {
}

// 9.11
function IsCallable() {
}

// 9.12
function SameValue(x, y) {
}
