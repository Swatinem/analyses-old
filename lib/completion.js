var esprima = require('esprima');

module.exports = Completer;

function Completer(options) {
	options = options || {};
	this.source = '';
	this.splice(0, 0, options.source);
	this.filename = options.filename || '';
}

/**
 * Used to dynamically patch up the source using the same interface as for
 * Arrays: (offset, characters to remove, string to add)
 */
Completer.prototype.splice = function Completer_splice(offset, remove, add) {
	this.source = this.source.slice(0, offset) + add + this.source.slice(offset + remove);
	// patch up hashbangs of .js executables:
	this.source = this.source.replace(/^#!/gm, '//');
	this.ast = null;
	try {
		// TODO: how to make this more tolerant to syntax errors, etc?
		this.ast = esprima.parse(this.source, {
			range: true,
			tolerant: true,
			comment: true,
			tokens: true // FIXME: maybe we don’t need those?
		});
	} catch (e) {
	}
};

/**
 * Check if the offset is inside a comment
 */
Completer.prototype._inComment = function Completer__inComment(offset) {
	if (!this.ast) return false;
	return this.ast.comments.some(function (comment) {
		return comment.range[0] < offset &&
			comment.range[1] + (comment.type == 'Block' ? 0 : 1) > offset;
	});
};

/**
 * provide completions at cursor position `offset`
 */
Completer.prototype.complete = function Completer_complete(offset) {
	
};
