var lib = require('../'),
	walker = lib.walker,
	findDeclarations = lib.findDeclarations,
	printCFG = lib.printCFG,
	copy = lib.utils.copy,
	equals = lib.utils.equals,
	esprima = require('esprima'),
	should = require('should');

describe('Walker', function () {
	it('should stop()', function () {
		walker({
			type: 'Type1',
			prop: {
				type: 'Type2'
			}
		}, {
			Type1: function (recurse, stop) {
				stop();
			},
			Type2: function () {
				should.fail('should not be reached');
			}
		});
	});

	it('should only recurse when the node is in range', function () {
		walker({
			type: 'Type1',
			prop: {
				type: 'Type2',
				range: [0,5]
			}
		}, {
			Type2: function () {
				should.fail('should not be reached');
			}
		}, 10);
	});

	it('should rethrow exceptions', function () {
		(function () {
		walker({
			type: 'Type1'
		}, {
			Type1: function () {
				throw 1;
			}
		});
		}).should.throw();
	});
});

describe('Find Declarations', function () {
	var code = 'function a() { (function () { var a = 1; with(o) { var b = 1; } }); }';

	it('should be recursive with recurse: true', function () {
		var ast = esprima.parse(code);
		var decls = findDeclarations(ast, {recurse: true});
		decls.functions.should.have.length(1, 'functions');
		decls.variables.should.have.length(2, 'variables');
	});

	it('should not be recursive by default', function () {
		var ast = esprima.parse(code);
		var decls = findDeclarations(ast);
		decls.functions.should.have.length(1, 'functions');
		decls.variables.should.have.length(0, 'variables');
	});

	it('should also collect function expressions with expressions: true', function () {
		var ast = esprima.parse(code);
		var decls = findDeclarations(ast, {recurse: true, expressions: true});
		decls.functions.should.have.length(2, 'functions');
	});
});

describe('Control Flow Graph to DOT', function () {
	it('should support custom labels', function () {
		var output = printCFG({label: 'test'});
		output.should.eql('n0 [label="test"]\n');
	});
});

describe('Deep Copy', function () {
	it('should copy the prototype chain correctly', function () {
		function T() {}
		var t = new T;
		var c = copy(t);
		c.should.be.an.instanceof.T;
	});

	it('should handle references correctly', function () {
		var o = {};
		o.a = {};
		o.b = o.a;
		o.a.should.equal(o.b);
		var c = copy(o);
		c.a.should.equal(c.b);
	});

	it('should handle cycles correctly', function () {
		var o = [];
		o.push(o);
		o[0].should.equal(o);
		var c = copy(o);
		c[0].should.equal(c);
	});

	it('should copy property descriptors correctly', function () {
		var o = {};
		Object.defineProperty(o, 'a', {writable: false, configurable: false, value: 1});
		var c = copy(o);
		(function () {
			c.a = 2;
		}).should.throw;
	});

	it('should copy extensible, frozen state correctly');
});

describe('Deep Equal', function () {
	it('should reject obvious cases', function () {
		var o = {};
		var c = {a: 1};
		equals(o, c).should.not.be.ok;
		o = {a: {}};
		c = {a: 1};
		equals(o, c).should.not.be.ok;
	});

	it('should handle cycles correctly', function () {
		var o = [];
		o.push(o);
		var c = copy(o);
		equals(o, c).should.be.ok;
	});

	it('should not care about property ordering', function () {
		var o = {a: 1, b: 2};
		var c = {b: 2, a: 1};
		equals(o, c).should.be.ok;
	});

	it('should handle references correctly', function () {
		var o = {};
		o.a = {};
		o.b = o.a;
		var c = copy(o);
		equals(o, c).should.be.ok;
	});

	it('should also check for prototype', function () {
		function f() {
			this.a = 1;
		}
		function g() {
			this.a = 1;
		}
		var a = new f;
		var b = new g;
		a.should.eql(b); // should does not check the prototype
		equals(a, b).should.not.be.ok;
	});
});
