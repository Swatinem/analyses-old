var value = require('../lib/infertypes/value');
var Value = value.Value;
var Reference = value.Reference;


describe('Value', function () {
	it('should have a typeof', function () {
		var val = new Value({typeof: 'number'});
		val.typeof.should.equal('number');
	});
	it('may have a knownvalue', function () {
		var val = new Value({knownvalue: 10});
		val.knownvalue.should.equal(10);
	});
	it('should be Falsy for an empty string', function () {
		var emptystring = new Value({typeof: 'string', knownvalue: ''});
		emptystring.isTruthy().should.not.be.ok;
		emptystring.isFalsy().should.be.ok;
	});
	it('should be Truthy for a non-empty string', function () {
		var string = new Value({typeof: 'string', knownvalue: 'foo'});
		string.isTruthy().should.be.ok;
		string.isFalsy().should.not.be.ok;
	});
	it('should be Falsy for a false boolean', function () {
		var emptystring = new Value({typeof: 'boolean', knownvalue: false});
		emptystring.isTruthy().should.not.be.ok;
		emptystring.isFalsy().should.be.ok;
	});
	it('should be Truthy for a true boolean', function () {
		var string = new Value({typeof: 'boolean', knownvalue: true});
		string.isTruthy().should.be.ok;
		string.isFalsy().should.not.be.ok;
	});
	it('should neither be Truthy or Falsy with no knownvalue', function () {
		var val = new Value({typeof: 'string'});
		val.isTruthy().should.not.be.ok;
		val.isFalsy().should.not.be.ok;
		val = new Value({typeof: 'boolean'});
		val.isTruthy().should.not.be.ok;
		val.isFalsy().should.not.be.ok;
	});
	it('should equal another Value by type', function () {
		var val1 = new Value({typeof: 'number', knownvalue: 10});
		var val2 = new Value({typeof: 'number', knownvalue: 1});
		val1.equals(val2).should.be.ok;
	});
	it('should not equal for functions', function () {
		var val1 = new Value({typeof: 'function'});
		var val2 = new Value({typeof: 'function'});
		val1.equals(val2).should.not.be.ok;
	});
	it('should equal for functions that are one and the same', function () {
		var val1 = new Value({typeof: 'function'});
		val1.equals(val1).should.be.ok;
	});
	it('should create a copy without knownvalue', function () {
		var val1 = new Value({typeof: 'number', knownvalue: 10});
		var val2 = Value.withoutValue(val1);
		val1.equals(val2).should.be.ok;
		val2.should.not.have.property.knownvalue;
	});
	it('should create props on the fly', function () {
		var val = new Value();
		var prop = val.get('test');
		prop.should.be.a.Reference;
	});
	it('should have assignable props', function () {
		var val = new Value();
		var number = new Value({typeof: number});
		var prop = val.set('test', number);
		val.get('test').equals(number);
	});
	it('should return all possible types of all props', function () {
		var number = new Value({typeof: 'number'});
		var val = new Value();
		var prop = val.set('test', number);
		var types = val.allPropTypes();
		types.should.be.a.Reference;
		types.equals(number).should.be.ok;
	});
	it('should return props of prototypes', function () {
		var proto = new Value();
		var prop = new Value({typeof: 'number'});
		proto.set('prop', prop);
		var val = new Value({proto: proto});
		
		val.get('prop').equals(prop).should.be.ok;
	});
	it('should add new properties to the current object and not the proto', function () {
		var num = new Value({typeof: 'number'});
		var str = new Value({typeof: 'string'});
		var val = new Value();
		var proto = new Value();
		proto.set('prop', num);
		val.proto = proto;
		val.set('prop', str);
		val.get('prop').equals(str).should.be.ok;
		val.proto.get('prop').equals(num).should.be.ok;
	});
	it('should not chain to the proto if noChain is set', function () {
		var num = new Value({typeof: 'number'});
		var val = new Value();
		var proto = new Value();
		proto.set('prop', num);
		val.proto = proto;
		val.get('prop', true).equals(num).should.not.be.ok;
	});
	it('should evaluateCall for a function', function () {
		var arg = new Reference(new Value({typeof: 'number'}));
		var val = new Value({typeof: 'function', evalFunc: function (thisVal, argVals) {
			return argVals[0];
		}});
		var ret = val.evaluateCall(null, [arg]);
		ret.retVal.equals(arg).should.be.ok;
	});
	it('should not evaluateCall more than once for the same this/args combination', function () {
		var arg = new Reference(new Value({typeof: 'number'}));
		var calls = 0;
		var val = new Value({typeof: 'function', evalFunc: function (thisVal, argVals) {
			calls++;
			return argVals[0];
		}});
		val.evaluateCall(null, [arg]);
		val.evaluateCall(null, [arg]);
		calls.should.equal(1);
	});
	it('should handle recursion in evaluateCall', function () {
		var arg = new Reference(new Value({typeof: 'number'}));
		var val = new Value({typeof: 'function', evalFunc: function (thisVal, argVals) {
			val.evaluateCall(null, [arg]);
			return argVals[0];
		}});
		var ret = val.evaluateCall(null, [arg]);
		ret.retVal.equals(arg).should.be.ok;
	});
});

describe('Reference', function () {
	it('should support construction with a `Value`', function () {
		var val = new Value({typeof: 'number'});
		var ref = new Reference(val);
		ref.should.be.a.Array;
		ref[0].should.equal(val);
	});
	it('should have more than one possible `Value`', function () {
		var ref = new Reference();
		var val1 = new Value({typeof: 'number'});
		var val2 = new Value({typeof: 'string'});
		ref.assign(val1);
		ref.assign(val2);
		ref.should.be.a.Array;
		ref.length.should.equal(2);
		ref[0].should.equal(val1);
		ref[1].should.equal(val2);
	});
	it('should not store duplicate `Value`s by type', function () {
		var ref = new Reference();
		var val1 = new Value({typeof: 'number', knownvalue: 1});
		var val2 = new Value({typeof: 'number', knownvalue: 10});
		ref.assign(val1);
		ref.assign(val2);
		ref.length.should.equal(1);
		var val3 = Value.withoutValue(val2);
		ref[0].equals(val3).should.be.ok;
		ref[0].should.not.have.property.knownvalue;
	});
	it('should support assignment of other `Reference`s', function () {
		var ref1 = new Reference();
		var val1 = new Value({typeof: 'number'});
		var val2 = new Value({typeof: 'number'});
		ref1.assign(val1);
		ref1.assign(val2);
		var ref2 = new Reference();
		ref2.assign(ref1);
		ref2.should.be.a.Array;
		ref2.length.should.equal(1);
		ref2[0].typeof.should.equal('number');
	});
	it('should equal another `Reference`', function () {
		var ref1 = new Reference(new Value({typeof: 'number'}));
		var ref2 = new Reference(new Value({typeof: 'number'}));
		ref1.equals(ref2).should.be.ok;
	});
	it('should contain another `Reference`', function () {
		var ref1 = new Reference(new Value({typeof: 'number'}));
		ref1.assign(new Value({typeof: 'string'}));
		var ref2 = new Reference(new Value({typeof: 'number'}));
		ref1.contains(ref2).should.be.ok;
		ref1.equals(ref2).should.not.be.ok;
	});
	it('should not be truthy or falsy when no value is present', function () {
		var ref = new Reference();
		ref.isTruthy().should.not.be.ok;
		ref.isFalsy().should.not.be.ok;
	});
	it('should not be truthy or falsy when there are both truthy and falsy value', function () {
		var ref = new Reference();
		ref.assign(new Value({typeof: 'boolean', knownvalue: true}));
		ref.assign(new Value({typeof: 'boolean', knownvalue: false}));
		ref.isTruthy().should.not.be.ok;
		ref.isFalsy().should.not.be.ok;
	});
	it('should not be truthy with truthy values', function () {
		var ref = new Reference();
		ref.assign(new Value({typeof: 'boolean', knownvalue: true}));
		ref.assign(new Value({typeof: 'string', knownvalue: 'foo'}));
		ref.isTruthy().should.be.ok;
		ref.isFalsy().should.not.be.ok;
	});
	it('should not be falsy with falsy values', function () {
		var ref = new Reference();
		ref.assign(new Value({typeof: 'boolean', knownvalue: false}));
		ref.assign(new Value({typeof: 'string', knownvalue: ''}));
		ref.isTruthy().should.not.be.ok;
		ref.isFalsy().should.be.ok;
	});
});

