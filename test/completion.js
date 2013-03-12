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
});
