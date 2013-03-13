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
		it('should gracefully handle syntax errors');
		it('should complete global variables');
	});
});
