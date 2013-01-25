#!/usr/bin/env node

var esprima = require('esprima'),
    lib = require('../');
    walker = lib.walker,
    findDeclarations = lib.findDeclarations,
    inferTypes = lib.inferTypes,
    stdlib = require('../lib/infertypes/stdlib')().stdlib;
    zmq = require('zmq');

var sock = process.argv[2];
if (!sock) {
	console.error('need to provide socket to listen on');
	process.exit(1);
}

var rep = zmq.socket('rep');

function send(obj) {
	rep.send(JSON.stringify(obj || []));
}

rep.on('message', function (message) {
	var msg = JSON.parse(message);
	var source = msg.source || '';
	var offset = msg.offset || 0;
	var filename = msg.filename;
	// filter out #! which is used by nodejs programs sometimes
	if (source.indexOf('#!') === 0) {
		source = '//' + source.substring(2);
	}
	try {
		// TODO: switch to error tolerant branch of esprima
		source = staleDot(source, offset);
		var ast = esprima.parse(source, {range: true, comment: true});
		ast.filename = filename;
		
		// first, look if we are inside a comment or literal, don’t complete there
		var comments = ast.comments;
		delete ast.comments;
		if (comments.some(function (comment) { return comment.range[0] < offset && comment.range[1] >= offset; }))
			throw new Error('in comment');
		var inLiteral = false;
		walker(ast, {
			Literal: function (recurse, stop) {
				if (this.range[0] < offset && this.range[1] >= offset) {
					inLiteral = true;
					stop();
				}
			}
		}, offset);
		if (inLiteral)
			throw new Error('in literal');
		
		// rewind the cursor to the last non-whitespace
		offset = rewindWhitespace(source, offset);
		
		function nameSort(a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		}

		function tryScope(recurse, stop) {
			// try to recurse into one of the statements. if none has stopped the
			// walk, go and complete the local vars up to the top of the stack
			if (this.body.forEach)
				this.body.forEach(recurse);
			else
				recurse(this.body);

			if (!this.frame) {
				return;
			}
			var result = [];
			function add(frame) {
				//if (!frame.vars)
				//	return;
				result = result.concat(Object.keys(frame.vars).map(function (v) {
					return v.substring(0, v.length - 1);
				}).filter(function (v) {
					return !~result.indexOf(v);
				}).sort(nameSort));
			}
			var frame = this.frame;
			do {
				add(frame);
			} while (frame = frame.parent);

			send(result);
			stop();
		}

		// see if we are completing a `MemberExpression`
		inferTypes(ast); // no return val, this modifies the ast in-place
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
				// FIXME: better recovery when the cursor position is at obj.|
				var result = [];
				props.forEach(function (propnames) {
					result = result.concat(
						propnames.filter(function (name) {
							return name !== 'ő' && !~result.indexOf(name);
							}).sort(nameSort));
				});
				send(result);
				stop();
			},
			Program: tryScope,
			FunctionExpression: tryScope,
			FunctionDeclaration: tryScope
		}, offset);
		//send({error: 'unreached'});
	} catch (e) {
		send({error: e.stack});
	}
});

rep.bind(sock, function () {
	console.log('listening on '+ sock);
});

// goes back from offset
function rewindWhitespace(source, offset) {
	var start = offset;
	while (start >= 0 && (source[start] === undefined || /\s/.test(source[start])))
		start--;
	return start;
}

// insert a bogus identifier if the char before the offset is a dot to make it
// parsable and always have a `MemberExpression`
function staleDot(source, offset) {
	var start = rewindWhitespace(source, offset);
	if (source[start] === '.') {
		source = source.substring(0, ++start) + 'ő' + source.substring(start);
	}
	return source;
}
