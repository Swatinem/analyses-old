var esprima = require('esprima');
var walker = require('./walker');
var fuzzy = require('fuzzy');

var inferTypes = require('./infertypes');

module.exports = Completer;

function Completer(options) {
	options = options || {};
	this.source = '';
	this.splice(0, 0, options.source);
	this.filename = options.filename || '';
	this.lastCompletion = null;
}

/**
 * Used to dynamically patch up the source using the same interface as for
 * Arrays: (offset, characters to remove, string to add)
 */
Completer.prototype.splice = function Completer_splice(offset, remove, add) {
	this.source = this.source.slice(0, offset) + add + this.source.slice(offset + remove);
	// patch up hashbangs of .js executables:
	this.source = this.source.replace(/^#!/gm, '//');
	this._ast = parse(this.source);
};

function parse(source) {
	try {
		// TODO: how to make this more tolerant to syntax errors, etc?
		return esprima.parse(source, {
			range: true,
			tolerant: true,
			comment: true,
			tokens: true
		});
	} catch (e) {
	}
	return null;
}

/**
 * Check if the offset is inside a comment
 */
Completer.prototype._inComment = function Completer__inComment(offset) {
	if (!this._ast) return false;
	return this._ast.comments.some(function (comment) {
		return comment.range[0] < offset &&
			comment.range[1] + (comment.type == 'Block' ? 0 : 1) > offset;
	});
};

/**
 * Check if the offset is inside a literal
 */
Completer.prototype._inLiteral = function Completer__inLiteral(offset) {
	if (!this._ast) return false;
	var inLiteral = false;
	walker(this._ast, {
		Literal: function (recurse, stop) {
			if (this.range[0] < offset && this.range[1] > offset) {
				inLiteral = true;
				stop();
			}
		}
	}, offset);
	return inLiteral;
};

/**
 * Returns the Identifier that at or near `offset`
 */
Completer.prototype._identifierAt = function Completer__identifierAt(offset) {
	if (!this._ast) return null;
	var lastIdentifier = null;
	for (var i = 0; i < this._ast.tokens.length; i++) {
		var token = this._ast.tokens[i];
		if (token.type == 'Identifier')
			lastIdentifier = token;
		if (token.range[1] > offset)
			return lastIdentifier;
		if (token.type != 'Identifier')
			lastIdentifier = null;
	}
	return lastIdentifier;
};

/**
 * Provide completions at cursor position `offset`
 */
Completer.prototype.complete = function Completer_complete(offset) {
	var ast = this._ast;
	// we have syntax errors and need to fix them
	if (!ast) {
		// FIXME: is this the right thing to overwrite the internal ast
		// used for comment, literal, and especially identifier lookup?
		ast = this._ast = this._fixDot(offset);
		if (!ast)
			return []; // syntax errors couldn’t be fixed -> no completion

		/*this.lastCompletion = {
			identifier: {value: '', range: [offset, offset]},
			suggestions: []
		};*/
	}

	// if the user is still typing the same identifier for which we already
	// ran the type inference, just use the previous results
	// for now, just run completion on every request
	try {
		if (this._inComment(offset) || this._inLiteral(offset))
			return [];

		inferTypes(ast);
		delete ast.range; // we want to recurse into the WHOLE buffer

		var results = [];
		walker(ast, {
			MemberExpression: function (recurse, stop) {
				// recurse into the object
				if (this.object.range[0] < offset && this.object.range[1] >= offset)
					return recurse(this.object);
				// we don’t complete computed properties
				if (this.computed)
					return recurse(this.property);

				var props = this.object.val.getPropNames();
				// props is an array of propnames, each one for the prototype chain/probable objects
				props.forEach(function (propnames, i) {
					propnames.forEach(function (prop) {
						results.push({
							identifier: prop,
							depth: i
						});
					});
				});
				stop();
			},
			Program: tryScope,
			FunctionExpression: tryScope,
			FunctionDeclaration: tryScope
		}, offset);

		function tryScope(recurse, stop) {
			// try to recurse into one of the statements. if none has stopped the
			// walk, go and complete the local vars up to the top of the stack
			if (this.body.forEach)
				this.body.forEach(recurse);
			else
				recurse(this.body);
			if (this.type !== 'Program' && offset >= this.range[1])
				return;

			if (!this.frame) {
				return;
			}
			function add(frame, depth) {
				Object.keys(frame.vars).forEach(function (ident) {
					results.push({
						identifier: ident.slice(0, -1),
						depth: depth
					});
				});
			}
			var frame = this.frame;
			var depth = 0;
			do {
				add(frame, depth);
				depth++;
			} while (frame = frame.parent);
			stop();
		}

		// do the fuzzy matching and sorting
		var term = this._identifierAt(offset);
		term = term && term.value || '';
		// FIXME: need to find a better way to reverse the thing we did in _fixDot
		term = term == 'valueOf' ? '' : term;
		var filtered = fuzzy.filter(term, results, {
			extract: function (res) { return res.identifier; }
		});
		// also consider the depth in the sorting for relevancy
		results = filtered.map(function (res) {
			return {
				identifier: res.string,
				score: res.score / (1 + res.original.depth)
			};
		});
		results.sort(function (a, b) {
			var rel = b.score - a.score;
			if (rel)
				return rel;
			return a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase());
		});
		results = results.map(function (res) { return res.identifier; });
		return results;
	} catch (e) {
		// TODO: logging
		return [];
	}
};

/**
 * Try to fix up syntax errors of the type `obj.|\nif (true) {}` in which case
 * the completion is requested for a non-finished MemberExpression
 */
Completer.prototype._fixDot = function Completer__fixDot(offset) {
	var source = this.source;

	// find the last non-whitespace character
	var start = offset - 1;
	while (start >= 0 && /\s/.test(source[start]) && source[start] !== '.')
		start--;
	// if it is not a dot, we can’t do anything about it
	if (source[start] !== '.')
		return null;
	// check if it is followed by a newline
	var end = offset;
	while (end < source.length && /\s/.test(source[end]) && source[end] !== '\n')
		end++;
	var newline = source[end] === '\n';
	// insert a bogus identifier, just use `valueOf` since every object has that
	// method
	return parse(source.slice(0, offset) + 'valueOf' + (newline ? ';' : '') + source.slice(offset));
};

