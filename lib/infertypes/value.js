/**
 * A `Reference` is a variable or object property.
 * It records one current `Value` and one or more previous `Value`s.
 */
function Reference(value) {
	Array.call(this);
	if (value) {
		this.assign(value);
	}
}
Reference.prototype = new Array();
Reference.prototype.assign = function (value) {
	if (value instanceof Reference) {
		var self = this;
		value.forEach(function (value) { self.assign(value); });
		return;
	} else if (!(value instanceof Value))
		return;
	for (var i = 0; i < this.length; i++) {
		var prev = this[i];
		if (prev.equals(value)) {
			// replace the previous value with a new one without a `knownvalue`
			this.splice(i, 1, Value.withoutValue(value));
			break;
		}
	}
	if (i == this.length)
		this.push(value);
}
Reference.prototype.toString = Reference.prototype.toJSON = function() {
	if (!this.length)
		return 'undefined';
	if (this.length == 1)
		return this[0].toString();
	else
		return "<" + this.map(
			function (value) { return value.toString(); }).join(" | ") + ">";
}
Reference.prototype.contains = function (that) {
	if (!that)
		return false;
	if (that instanceof Value)
		that = [that];
	if (!(that instanceof Array))
		return false;
	if (that.length > this.length)
		return false;
	for (var i = 0; i < that.length; i++) {
		var thatval = that[i];
		if (this.every(function (val) { return !thatval.equals(val); }))
			return false;
	}
	return true;
}
Reference.prototype.equals = function (that) {
	if (!that)
		return false;
	if (that instanceof Value)
		that = [that];
	if (!(that instanceof Array))
		return false;
	if (that.length != this.length)
		return false;
	return this.contains(that);
};
Reference.prototype.isTruthy = function () {
	return this.length && this.every(function (val) { return val.isTruthy(); });
}
Reference.prototype.isFalsy = function () {
	return this.length && this.every(function (val) { return val.isFalsy(); });
}
Reference.prototype.getPropNames = function () {
	// FIXME: this should probably be moved to `Value`
	var propnames = [];
	var checkQueue = [];
	function checkProps(obj) {
		var propnames = [];
		for (var k in obj.properties) {
			var clean = k.substring(0, k.length - 1);
			if (!~propnames.indexOf(clean))
				propnames.push(clean);
		}
		if (obj.proto && !~checkQueue.indexOf(obj.proto))
			checkQueue.push(obj.proto);
		return propnames;
	}
	this.forEach(function (obj) { checkQueue.push(obj); });
	while (checkQueue.length) {
		propnames.push(checkProps(checkQueue.shift()));
	}
	return propnames;
}

exports.Reference = Reference;

/**
 * A `Value` is one specific object, function or primitive.
 * it has properties which are `Reference`s,
 * a prototype which is another `Value`, a typeof, a typename
 * and it may have a known value for primitives
 */
// TODO: the properties should be like a property descriptor
function Value(init) {
	if (!init)
		init = {};
	this.properties = init.properties || [];
	this.typeof = init.typeof ? init.typeof : 'object';
	if (init.knownvalue !== undefined)
		this.knownvalue = init.knownvalue;
	if (init.evalFunc)
		this.evalFunc = init.evalFunc;
	if (init.proto)
		this.proto = init.proto;
}
Value.withoutValue = function (that) {
	var val = new Value(that);
	delete val.knownvalue;
	return val;
}
Value.prototype.evaluateCall = function (thisVal, argVals, type) {
	if (!this.evalFunc)
		return new Reference();
	var transfer = this.transfer = this.transfer || [];
	for (var i in transfer) {
		var known = transfer[i];
		if (known.thisVal && thisVal && !known.thisVal.equals(thisVal))
			continue;
		if (known.argVals.length != argVals.length)
			continue;
		for (var j = 0; j < argVals.length; j++) {
			if (!known.argVals[j].equals(argVals[j]))
				break;
		}
		if (j != argVals.length)
			continue;
		return known;
	}
	var transferObject = {thisVal: thisVal, argVals: argVals,
		retVal: new Reference(), throwVal: new Reference()};
	// add a transfer object without retVal so we return it when we have an exact
	// recursion
	// FIXME: better recursion tracking; we really need `object`s to .equal()
	if (transfer.push(transferObject) > 20)
		return transferObject;
	var retVal = this.evalFunc(thisVal, argVals, type);
	if (retVal instanceof Reference)
		transferObject.retVal = retVal;
	else {
		transferObject.retVal = retVal.retVal;
		transferObject.throwVal = retVal.throwVal;
	}
	return transferObject;
}
Value.prototype.equals = function (that) {
	if (this === that)
		return true;
	if (!(that instanceof Value))
		return false;
	if (this.typeof && that.typeof && this.typeof === that.typeof) {
		if (this.typeof === 'object') {
			return (this.knownvalue !== undefined && this.knownvalue === that.knownvalue);
		} else if (this.typeof === 'function')
			return false;
		else
			return true;
	}
	return false;
}
Value.prototype.get = function (name, noChain) {
	// if we have generic properties, return that even for exactly known props
	if (this.genericNumber && isNumeric(name))
		return this.genericNumber;
	if (this.genericString && !isNumeric(name))
		return this.genericString;
	var propname = name + '-';
	// return a prop if it is in the prototype chain
	var child = this;
	while (!(propname in child.properties) && child.proto && !noChain) {
		child = child.proto;
		if (propname in child.properties)
			return child.properties[propname];
	}
	return (propname in this.properties)
		? this.properties[propname]
		: new Reference();
}
Value.prototype.set = function (name, prop) {
	// if we have generic properties, assign to that even for exactly known props
	if (this.genericNumber && isNumeric(name)) {
		this.genericNumber.assign(prop);
		return this.genericNumber;
	}
	if (this.genericString && !isNumeric(name)) {
		this.genericString.assign(prop);
		return this.genericString;
	}
	var propname = name + '-';
	if (!(propname in this.properties))
		this.properties[propname] = new Reference();
	this.properties[propname].assign(prop);
	return this.properties[propname];
}
/**
 * if no exact propname is known, merge string or number props to a generic
 * version and use that
 */
Value.prototype._mergeString = function () {
	this.genericString = this.genericString || new Reference();
	var keys = Object.keys(this.properties);
	for (var i in keys) {
		var k = keys[i];
		if (!isNumeric(k)) {
			this.genericString.assign(this.properties[k]);
			//delete this.properties[k];
		}
	}
}
Value.prototype._mergeNumber = function () {
	this.genericNumber = this.genericNumber || new Reference();
	var keys = Object.keys(this.properties);
	for (var i in keys) {
		var k = keys[i];
		if (isNumeric(k)) {
			this.genericNumber.assign(this.properties[k]);
			delete this.properties[k];
		}
	}
}
Value.prototype.setGeneric = function (prop, type) {
	if (type === 'string') {
		this._mergeString();
		this.genericString.assign(prop);
		return this.genericString;
	}
	else if (type === 'number') {
		this._mergeNumber();
		this.genericNumber.assign(prop);
		return this.genericNumber;
	}
	else { // we have no idea what type the generic prop has
		this._mergeNumber();
		this._mergeString();
		this.genericNumber.assign(prop);
		this.genericString.assign(prop);
		var val = new Reference(this.genericNumber);
		val.assign(this.genericString);
		return val;
	}
}
Value.prototype.getGeneric = function (type) {
	if (type === 'string') {
		this._mergeString();
		return this.genericString;
	}
	else if (type === 'number') {
		this._mergeNumber();
		return this.genericNumber;
	}
	else {
		this._mergeNumber();
		this._mergeString();
		var val = new Reference(this.genericNumber);
		val.assign(this.genericString);
		return val;
	}
}
Value.prototype.allPropTypes = function () {
	var val = this.allProps = this.allProps || new Reference();
	for (var k in this.properties) {
		val.assign(this.properties[k]);
	}
	return val;
}
Value.prototype.toString = function () {
	return this.typeof;
}
Value.prototype.isTruthy = function () {
	return (~['boolean', 'string'].indexOf(this.typeof) &&
		this.knownvalue !== undefined && this.knownvalue);
}
Value.prototype.isFalsy = function () {
	return (~['boolean', 'string'].indexOf(this.typeof) &&
		this.knownvalue !== undefined && !this.knownvalue);
}

function isNumeric(propname) {
	if (propname[propname.length - 1] === '-')
		propname = propname.substring(0, propname.length - 1);
	return propname == parseInt(propname);
}

exports.Value = Value;
