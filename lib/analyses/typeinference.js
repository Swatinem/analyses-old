var walker = require('../walker');
var worklist = require('../worklist');
var utils = require('../utils');
var Set = utils.Set;
var copy = utils.copy;
var equals = utils.equals;

var GlobalContext = require('../esstd');
var evaluate = require('../typeinference/evaluate');
var value = require('../esstd/value');
var MultiValue = value.MultiValue;

// TODO: work on input straight away but make a deep copy to the output after
// processing, hopefully this will fix the problem that deep copy messes up
// the references

module.exports = function typeInference(cfg, globals) {
	if (!globals) {
		globals = new GlobalContext(cfg[0].astNode, typeInference);
	}
	var context = globals.context;
	
	worklist(cfg, function (input, list) {
		var oldOutput = this.output;
		var output = this.output = input;
		if (!output.length) {
			output.push(context);
		}
		if (this.type || !this.astNode)
			return output;
		
		globals.context = output[0];
		var resultValue = evaluate(this.astNode, globals);
		if (!this.true || !resultValue)
			return output; // let the worklist worry about old output etc...
		if (oldOutput && oldOutput.equals(output))
			return; // no change -> algorithm ends
		// else: we know that output changed AND that we have a branch node
		var bool = globals.ToBoolean(resultValue);
		if (typeof bool.PrimitiveValue !== 'undefined') {
			if (bool.PrimitiveValue)
				list.push(this.true);
			else
				list.push(this.false);
		} else {
				list.push(this.true);
				list.push(this.false);
		}
		if (this.exception)
			list.push(this.exception);
	}, {direction: 'forward', merge: function (a, b) {
		// Merge function that merges the two contexts of two branches into one

		mergeEnvironment(a[0].LexicalEnvironment, b[0].LexicalEnvironment);
		return a;
	}});
	
	return globals;
};

function mergeEnvironment(a, b) {
	if (a.outer)
		mergeEnvironment(a.outer, b.outer);
	if (a.record.object) { // object environment
		// since the global object has no prototype, it is guaranteed to be mergeable
		// and will not mess up references or cycles
		mergeValue(a.record.object, b.record.object);
	}
}

function mergeValue(a, b) {
	var merged = [];
	function merge(a, b) {
		if (~merged.indexOf(a)) {
			//console.log('already merged: ', a);
			return a;
		}
		if (a && !a.Type || !a || a.Type !== 'Undefined')
			merged.push(a);
		// make this a MultiValue;
		a = (new MultiValue).push(a);
		b = (new MultiValue).push(b);
	
		// check all the values in b and see if we can merge them into any of a
		b.forEach(function (bVal) {
			for (var i = 0; i < a.length; i++) {
				var aVal = a[i];
				if (!aVal && !bVal)
					return; // merged undefined
				if (!aVal || !bVal)
					continue; // cant merge with `any`
				if (aVal.Type !== bVal.Type)
					continue; // not mergeable
				if (aVal.Type !== 'Object' && aVal.PrimitiveValue === bVal.PrimitiveValue)
					return; // same PrimitiveValue -> merged
				if (aVal.Type === 'Boolean' && aVal.PrimitiveValue !== bVal.PrimitiveValue) {
					aVal.PrimitiveValue = undefined;
					return; // we merged Boolean:true and Boolean:false into a generic Boolean
				}
				if (aVal.Type !== 'Object' || !equals(aVal.Prototype, bVal.Prototype) || aVal.Code)
					continue; // non-objects, objects with different prototypes or
					// functions are not mergeable
				// we have two objects here with the same Prototype:
				// merge the properties of b into those of a
				Object.keys(bVal.properties).forEach(function (prop) {
					if (prop in aVal.properties) {
						// merge the props
						// FIXME: work correctly with property descriptors
						var merged = merge(aVal.properties[prop].Value, bVal.properties[prop].Value);
						if (merged instanceof MultiValue)
							aVal.properties[prop].Value = merged;
						// else: things have already been merged into a
					} else // prop from b not in a -> just add it
						aVal.properties[prop] = bVal.properties[prop];
				});
				return;
			}
			// we were not able to merge it into any existing value in a so we add it
			// as another option:
			a.push(bVal);
		});
		return a.length === 1 ? a[0] : a;
	}
	return merge(a, b);
}
