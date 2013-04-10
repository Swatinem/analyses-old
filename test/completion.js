var should = require('should');

var Completion = require('../').Completion;

function includes(res, identifier) {
	return res.some(function (v) {
		return v.identifier == identifier;
	});
}

describe('Completion', function () {
	it('should automatically convert hashbangs', function () {
		var c = new Completion({
			source: '#!/usr/bin/env node\n'
		});
		c.source.should.eql('///usr/bin/env node\n');
	});

	it('should remove hashbangs for dynamically spliced code', function () {
		var c = new Completion({
			source: '#!/usr/bin/env node\n'
		});
		c.splice(0, 0,
			'#!/usr/bin/env node\n' +
			'#!foo #!bar'
		);
		c.source.should.eql(
			'///usr/bin/env node\n' +
			'//foo #!bar///usr/bin/env node\n'
		);
	});

	describe('Comment detection', function () {
		it('should handle line comments', function () {
			var c = new Completion({
				source: '// foo\nbar'
			});
			c._inComment(0).should.be.false;
			c._inComment(1).should.be.true;
			c._inComment(6).should.be.true;
			c._inComment(7).should.be.false;
		});
		it('should handle block comments', function () {
			var c = new Completion({
				source: '/**/foobar'
			});
			c._inComment(0).should.be.false;
			c._inComment(1).should.be.true;
			c._inComment(3).should.be.true;
			c._inComment(4).should.be.false;
		});
	});

	describe('Literal detection', function () {
		it('should detect strings', function () {
			var c = new Completion({
				source: '"string".prop'
			});
			c._inLiteral(0).should.be.false;
			c._inLiteral(1).should.be.true;
			c._inLiteral(8).should.be.true;
			c._inLiteral(9).should.be.false;
		});
		it('should detect numbers', function () {
			var c = new Completion({
				source: '(123).prop'
			});true
			c._inLiteral(1).should.be.false;
			c._inLiteral(2).should.be.true;
			c._inLiteral(4).should.be.true;
			c._inLiteral(5).should.be.false;
		});
		it('should detect booleans', function () {
			var c = new Completion({
				source: 'true.prop'
			});
			c._inLiteral(0).should.be.false;
			c._inLiteral(1).should.be.true;
			c._inLiteral(4).should.be.true;
			c._inLiteral(5).should.be.false;
		});
		it('should detect regexp', function () {
			var c = new Completion({
				source: '/ab/.prop'
			});
			c._inLiteral(0).should.be.false;
			c._inLiteral(1).should.be.true;
			c._inLiteral(4).should.be.true;
			c._inLiteral(5).should.be.false;
		});
	});

	describe('Identifier detection', function () {
		it('should find the identifier when offset is in it', function () {
			var c = new Completion({
				source: 'ident'
			});
			c._identifierAt(0).should.include({value: 'ident'});
		});
		it('should find the identifier when offset is after it', function () {
			var c = new Completion({
				source: 'o     .       prop'
			});
			c._identifierAt(3).should.include({value: 'o', range: [0,1]});
		});
		it('should find the identifier when offset is before it', function () {
			var c = new Completion({
				source: 'o .       prop'
			});
			c._identifierAt(4).should.include({value: 'prop', range: [10,14]});
		});
		it('should return null when no identifier present', function () {
			var c = new Completion({
				source: 'if (ident) {}'
			});
			should.not.exist(c._identifierAt(2));
			c._identifierAt(9).should.include({value: 'ident', range: [4, 9]});
			should.not.exist(c._identifierAt(10));
		});
		it('should find the identifiers exactly when not in MemberExpressions', function () {
			var c = new Completion({
				source: 'id1\n\n\n\n\nid2'
			});
			should.not.exist(c._identifierAt(4));
		});
	});

	it('should fix stale dots in a statement', function () {
			var c = new Completion({
				source: '(10).  \nif (true) {}'
			});
			var fixed = c._fixDot(7);
			fixed.body[1].should.include({type: 'IfStatement'});
	});

	it('should fix stale dots in an expression', function () {
			var c = new Completion({
				source: 'if (obj.   \n) {}'
			});
			var fixed = c._fixDot(12);
			fixed.body[0].should.include({type: 'IfStatement'});
	});

	describe('autocompletion', function () {
		it('should return empty when in comments', function () {
			var c = new Completion({
				source: '/* foo */'
			});
			var res = c.complete(3);
			res.should.be.empty;
		});

		it('should return empty when in literals', function () {
			var c = new Completion({
				source: '" string "'
			});
			var res = c.complete(3);
			res.should.be.empty;
		});

		it('should gracefully handle syntax errors', function () {
			var c = new Completion({
				source: 'var o = {a: 1};\nif (o.) {}'
			});
			var res = c.complete(22);
			includes(res, 'a').should.be.ok;
		});

		it('should complete global variables', function () {
			var c = new Completion({
				source: '\nvar a;'
			});
			var res = c.complete(0);
			includes(res, 'a').should.be.ok;
		});

		it('should sort based on fuzzy matching', function () {
			var c = new Completion({
				source: 'var o = {propa: 1, propb: 2, porpa: 3};\no.pra'
			});
			var res = c.complete(c.source.length);
			res[0].should.include({identifier: 'propa'});
			res[1].should.include({identifier: 'porpa'});
		});

		it('should sort based on depth', function () {
			var c = new Completion({
				source: 'var identa;\na();\nfunction a() { var identb; ide}'
			});
			var res = c.complete(c.source.length - 1);
			res[0].should.include({identifier: 'identb'});
			res[1].should.include({identifier: 'identa'});
		});

		it('should sort function arguments above global vars', function () {
			var c = new Completion({
				source: 'var abc1;\n(function (abc2, zzz) { var local;})()'
			});
			var res = c.complete(c.source.length - 4);
			res[0].should.include({identifier: 'abc2'});
			// 1 = arguments, 2 = local
			res[3].should.include({identifier: 'zzz'});
			res[4].should.include({identifier: 'abc1'});
		});

		it('should complete function arguments', function () {
			var c = new Completion({
				source: 'function a(arg1, arg2) {\n}'
			});
			var res = c.complete(c.source.length - 1);
			includes(res, 'arguments').should.be.ok;
			includes(res, 'arg1').should.be.ok;
			includes(res, 'arg2').should.be.ok;
		});

		it('should not include the same var multiple times', function () {
			var c = new Completion({
				source: 'function a() {function foo(a) {\n}}'
			});
			var res = c.complete(c.source.length - 2);
			var numA = 0;
			var numArguments = 0;
			res.forEach(function (v) {
				if (v.identifier == 'a')
					numA++;
				if (v.identifier == 'arguments')
					numArguments++;
			});
			numA.should.eql(1);
			numArguments.should.eql(1);
		});

		it('should not complete function scope right after the closing bracket', function () {
			var c = new Completion({
				source: 'function a(arg1, arg2) {\n}'
			});
			var res = c.complete(c.source.length);
			includes(res, 'arguments').should.not.be.ok;
			includes(res, 'arg1').should.not.be.ok;
			includes(res, 'arg2').should.not.be.ok;
		});

		it('should not add the sole term interactively', function () {
			var c = new Completion({
				source: 'function a() {arguments\n}'
			});
			var res = c.complete(c.source.length - 2, {interactive: true});
			res.should.be.empty;
		});
	});
});
