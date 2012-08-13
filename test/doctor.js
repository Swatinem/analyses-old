var esprima = require('esprima'),
    inferTypes = require('../').inferTypes,
    fs = require('fs');

var skip = [
	// TODO?: getters/setters:
	217,
	// TODO: for-in
	119, 177, 186,
	// TODO: invalid index of unmerged array
	78, 79,
	// TODO: apply with merged array
	149,
	// TODO: && with undefined property
	90,

	// WONTFIX:
	// with:
	195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 228,
	// let:
	208, 209, 210, 211, 212, 213, 216, 222, 226,
	// syntax errors:
	84, 218, 219,
	// wrong per http://es5.github.com/#x13.2.2: new can only return objects
	10,
	// we are actually better here:
	34, 172, 187,
].map(function (num) { return 'test' + num + '.js'; });
describe('doctor.js', function () {
	var files = [];
	files = fs.readdirSync(__dirname + '/doctorjstests/');
	files.forEach(function (file) {
		if (/test\d+\.js/.test(file) && !~skip.indexOf(file) /*&& file === 'test10.js'*/) {
			it(file, function () {
				var contents = fs.readFileSync(__dirname + '/doctorjstests/' + file, 'utf8');
				var types = inferTypes(esprima.parse(contents));
				var transfer = types.vars['test-'][0].transfer[0];
				if (!transfer.argVals[0].equals(transfer.retVal))
					transfer.argVals[0].should.equal(transfer.retVal);
				else
					true.should.be.ok;
			});
		}
	});
});
