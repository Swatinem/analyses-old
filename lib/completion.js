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
	this._lastCompletion = null;
	this._ast = null;
}

/**
 * Used to dynamically patch up the source using the same interface as for
 * Arrays: (offset, characters to remove, string to add)
 */
Completer.prototype.splice = function Completer_splice(offset, remove, add) {
	this.source = this.source.slice(0, offset) + add + this.source.slice(offset + remove);
	// patch up hashbangs of .js executables:
	this.source = this.source.replace(/^#!/gm, '//');
	this._ast = null;
};

Completer.prototype._getAst = function Completer__getAst() {
	return this._ast || (this._ast = parse(this.source));
};

function parse(source, error) {
	try {
		// TODO: how to make this more tolerant to syntax errors, etc?
		var ast = esprima.parse(source, {
			range: true,
			tolerant: true,
			comment: true,
			tokens: true
		});
		// the range for `Program` spans from the first char to the last,
		// not the whole buffer like we would expect
		ast.range[0] = 0;
		ast.range[1] = source.length;
		return ast;
	} catch (e) {
		if (error) throw e;
	}
}

/**
 * Check if the offset is inside a comment
 */
Completer.prototype._inComment = function Completer__inComment(offset) {
	var ast = this._getAst();
	if (!ast) return false;
	return ast.comments.some(function (comment) {
		return comment.range[0] < offset &&
			comment.range[1] + (comment.type == 'Block' ? 0 : 1) > offset;
	});
};

/**
 * Check if the offset is inside a literal
 */
Completer.prototype._inLiteral = function Completer__inLiteral(offset) {
	var ast = this._getAst();
	if (!ast) return false;
	var inLiteral = false;
	walker(ast, {
		Literal: function (recurse, stop) {
			if (this.range[0] < offset && this.range[1] >= offset) {
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
	var ast = this._getAst();
	if (!ast) return null;
	var inMember = false;
	var lastIdentifier = null;

	walker(ast, {
		MemberExpression: function (recurse) {
			inMember = true;
			recurse(this.object);
			recurse(this.property);
		},
		BlockStatement: function (recurse) {
			inMember = false;
		},
		Identifier: function (recurse, stop) {
			if (this.range[0] <= offset && this.range[1] >= offset)
				lastIdentifier = this;
		}
	}, offset);

	if (lastIdentifier || !inMember)
		return lastIdentifier;

	for (var i = 0; i < ast.tokens.length; i++) {
		var token = ast.tokens[i];
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
Completer.prototype.complete = function Completer_complete(offset, options) {
	var results = this._getResults(offset);
	if (!results)
		return [];

	// do the fuzzy matching and sorting
	var term = results.identifier && results.identifier.value || '';
	// FIXME: need to find a better way to reverse the thing we did in _fixDot
	term = term == 'valueOf' ? '' : term;
	var filtered = fuzzy.filter(term, results.suggestions, {
		pre: '<b>',
		post: '</b>',
		extract: function (res) { return res.identifier; }
	});
	// also consider the depth in the sorting for relevancy
	results = filtered.map(function (res) {
		var o = res.original;
		return {
			identifier: o.identifier,
			markup: res.string,
			score: (1 + res.score) / (1 + o.depth),
			type: 'value', // TODO: or `function`, but hardcoded for now
			info: '', // TODO: markup to show the value/function signature
		};
	});
	// if the completion is interactive, don’t show a useless suggestion for
	// something the user already typed
	if (options &&
	    options.interactive &&
	    results.length == 1 &&
	    results[0].identifier == term)
		return [];
	results.sort(function (a, b) {
		var rel = b.score - a.score;
		if (rel)
			return rel;
		return a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase());
	});
	// TODO: maybe also return the start/end pos of the token?
	return results;
};

Completer.prototype._getResults = function Completer__getResults(offset) {
	// FIXME: inferTypes messes up the AST so it can’t be reused
	var ast = this._ast = parse(this.source);
	var identifier;
	// we have syntax errors and need to fix them
	if (!ast) {
		// FIXME: is this the right thing to overwrite the internal ast
		// used for comment, literal, and especially identifier lookup?
		ast = this._ast = this._fixDot(offset);
		if (!ast)
			return null; // syntax errors couldn’t be fixed -> no completion
		identifier = {value: '', range: [offset, offset]};
	} else {
		identifier = this._identifierAt(offset);
	}

	if (this._inComment(offset) || this._inLiteral(offset)) {
		return null;
	}
	// if the user is still typing the same identifier for which we already
	// ran the type inference, just use the previous results since only the
	// matching changes
	// TODO: need something more lightweight that does not require the file
	// to be re-parsed all the time
	if (identifier &&
	    this._lastCompletion &&
	    this._lastCompletion.identifier &&
	    this._lastCompletion.identifier.range[0] == identifier.range[0]) {
		// but make sure to update the identifier used for matching:
		this._lastCompletion.identifier = identifier;
		return this._lastCompletion;
	}

	this._lastCompletion = {
		identifier: identifier,
		suggestions: null
	};

	inferTypes(ast);

	var results = [];
	var identifiers = [];
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
					if (parseInt(prop, 10) == prop || ~identifiers.indexOf(prop))
						return;
					identifiers.push(prop);
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
				if (~identifiers.indexOf(ident))
					return;
				identifiers.push(ident);
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

	this._lastCompletion.suggestions = results;
	return this._lastCompletion;
};

/**
 * Try to fix up syntax errors of the type `obj.|\nif (true) {}` in which case
 * the completion is requested for a non-finished MemberExpression
 * TODO: also fix up incomplete ObjectExpressions like `{prop: |, prop2: val}`
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
	try {
		return parse(source.slice(0, offset) + 'valueOf' + (newline ? ';' : '') + source.slice(offset), true);
	} catch (e) {
		throw new Error('Could not fix up the source');
	}
};

