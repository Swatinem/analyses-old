exports.UniqueQueue = UniqueQueue;
exports.Set = Set;
exports.extend = extend;
exports.equals = equals;
exports.copy = copy;

/**
 * A queque that makes sure that `push`ed elements are never duplicated
 */
function UniqueQueue() {
	Array.call(this);
}
UniqueQueue.prototype = Object.create(Array.prototype);
extend(UniqueQueue.prototype, {
	push: function (elem) {
		var pos = this.indexOf(elem);
		if (pos != -1)
			this.splice(pos, 1);
		Array.prototype.push.call(this, elem);
	}
});

/**
 * This is a general Set that can `union` and `intersect` with another Set
 * and uses the `equals` function of elements if they have one.
 * Other methods include `contains` and `equals`.
 */
function Set() {
	Array.call(this);
}
Set.prototype = Object.create(Array.prototype);
extend(Set.prototype, {
	push: function (elem) {
		if (!this.contains(elem))
			Array.prototype.push.call(this, elem);
		return this;
	},
	removeAll: function (other) {
		// TODO: custom indexOf that uses elem.equals
		var self = this;
		other.forEach(function (elem) {
			var index = self.indexOf(elem);
			if (index === -1)
				return;
			self.splice(index, 1);
		});
		return this;
	},
	copy: function () {
		var that = new Set();
		this.forEach(function (elem) {
			that.push(elem.copy && elem.copy() || copy(elem));
		});
		return that;
	},
	union: function (other) {
		other.forEach(this.push.bind(this));
		return this;
	},
	intersect: function (other) {
		for (var i = 0; i < this.length; i++) {
			if (!other.contains(this[i])) {
				this.splice(i, 1);
				i--;
			}
		}
		return this;
	},
	contains: function (elem) {
		return this.some(function (elemB) {
			return elem === elemB || elem && elem.equals && elem.equals(elemB) || equals(elem, elemB);
		});
	},
	equals: function (other) {
		if (other.length != this.length)
			return false;
		return this.every(function (elem) {
			return other.contains(elem);
		});
	}
});

function extend(a, b) {
	if (a && b) {
		for (var key in b) {
			a[key] = b[key];
		}
	}
	return a;
}

/**
 * a deep equals implementation that can also work with cycles and works
 * efficiently with references
 */
function equals(a, b) {
	var eqa = [];
	var eqb = [];
	function deepEqual(a, b) {
		if (a === b)
			return true;
		else if (typeof a !== typeof b)
			return false;
		else if (typeof a === 'object' && a !== null) {
			var indexA = eqa.indexOf(a);
			if (indexA !== -1 && indexA === eqb.indexOf(b))
				return true; // just assume true if we find a cycle
			eqa.push(a);
			eqb.push(b);
			var pa = Object.getPrototypeOf(a);
			var pb = Object.getPrototypeOf(b);
			if (pa !== pb)
				return false;
			var ka = Object.keys(a).sort();
			var kb = Object.keys(b).sort();
			if (ka.length !== kb.length)
				return false;
			for (var i = 0; i < ka.length; i++) {
				if (ka[i] !== kb[i])
					return false;
				var k = ka[i];
				if (!deepEqual(a[k], b[k]))
					return false;
			}
			return true; // no props -> equal
		} else
			return false; // dont care about anything other than primitives and objects
	}
	return deepEqual(a, b);
}

/**
 * a deep copy implementation that takes care of correct prototype chain
 * and cycles, references
 */
function copy(o, skipProps) {
	// used for cycle and reference detection:
	var originals = [];
	var copies = [];
	skipProps = skipProps || [];
	function deepCopy(o) {
		if (!o)
			return o; // null, undefined or falsy primitive
		if (~['object'/*, 'function'*/].indexOf(typeof o)) {
			var originalPos = originals.indexOf(o);
			if (originalPos !== -1) // we already know the object
				return copies[originalPos];

			// else: create a copy:
			var proto = Object.getPrototypeOf(o);
			// FIXME: copying functions?!?
			var copy = Object.create(proto);
			// save the copy in the cache before going over the props, in case there
			// is a cycle
			originals.push(o);
			copies.push(copy);
			
			var props = Object.getOwnPropertyNames(o);
			props.forEach(function (prop) {
				var propdesc = Object.getOwnPropertyDescriptor(o, prop);
				var newDescriptor;
				if (propdesc.get || propdesc.set) {
					// FIXME: just copy accessor properties for now before we can copy functions
					newDescriptor = propdesc;
				} else {
					// deep copy data properties
					newDescriptor = {
						writable: propdesc.writable,
						configurable: propdesc.configurable,
						enumerable: propdesc.enumerable,
						value: ~skipProps.indexOf(prop) ? propdesc.value : deepCopy(propdesc.value),
					};
				}
				Object.defineProperty(copy, prop, newDescriptor);
			});
			return copy;
		}
		return o;
	}
	return deepCopy(o);
}
