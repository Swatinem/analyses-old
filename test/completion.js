var should = require('should');

var Completion = require('../').Completion;

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
			c._inLiteral(7).should.be.true;
			c._inLiteral(8).should.be.false;
		});
		it('should detect booleans', function () {
			var c = new Completion({
				source: 'true.prop'
			});
			c._inLiteral(0).should.be.false;
			c._inLiteral(1).should.be.true;
			c._inLiteral(3).should.be.true;
			c._inLiteral(4).should.be.false;
		});
		it('should detect regexp', function () {
			var c = new Completion({
				source: '/ab/.prop'
			});
			c._inLiteral(0).should.be.false;
			c._inLiteral(1).should.be.true;
			c._inLiteral(3).should.be.true;
			c._inLiteral(4).should.be.false;
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
			res.should.includeEql('a');
		});

		it('should complete global variables', function () {
			var c = new Completion({
				source: '\nvar a;'
			});
			var res = c.complete(0);
			res.should.includeEql('a');
		});

		it('should sort based on fuzzy matching', function () {
			var c = new Completion({
				source: 'var o = {propa: 1, propb: 2, porpa: 3};\no.pra'
			});
			var res = c.complete(c.source.length);
			res.should.eql(['propa', 'porpa']);
		});

		it('should sort based on depth', function () {
			var c = new Completion({
				source: 'var identa;\na();\nfunction a() { var identb; ide}'
			});
			var res = c.complete(c.source.length - 1);
			res.should.eql(['identb', 'identa']);
		});

		it('should complete function arguments', function () {
			var c = new Completion({
				source: 'function a(arg1, arg2) {\n}'
			});
			var res = c.complete(c.source.length - 1);
			res.should.includeEql('arguments');
			res.should.includeEql('arg1');
			res.should.includeEql('arg2');
		});

		it('should not complete function scope right after the closing bracket', function () {
			var c = new Completion({
				source: 'function a(arg1, arg2) {\n}'
			});
			var res = c.complete(c.source.length);
			res.should.not.includeEql('arguments');
			res.should.not.includeEql('arg1');
			res.should.not.includeEql('arg2');
		});
	});
});
