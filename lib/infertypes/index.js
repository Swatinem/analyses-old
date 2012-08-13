var evaluate = require('./evaluate');

var inferTypes = module.exports = function(astNode) {
	return evaluate(astNode);
}
