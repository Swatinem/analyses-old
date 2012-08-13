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
		
		// see if we are completing a `MemberExpression`
		var sent = false;
		walker(ast, {
			MemberExpression: function (recurse, stop) {
				// recurse into the object
				if (this.object.range[0] < offset && this.object.range[1] >= offset)
					return recurse(this.object);
				// we don’t complete computed properties
				if (this.computed)
					return recurse(this.property);

				inferTypes(ast); // no return val, this modifies the ast in-place
				var props = this.object.val.getPropNames();
				// props is an array of propnames, each one for the prototype chain/probable objects
				// FIXME: better recovery when the cursor position is at obj.|
				var result = [];
				props.forEach(function (propnames) {
					result = result.concat(
						propnames.filter(function (name) {
							return name !== 'ő' && !~result.indexOf(name);
							}).sort());
				});
				send(result);
				sent = true;
				stop();
			}
		}, offset);
		if (sent)
			return;

		// go through the ranges and unshift them, so we get matching scopes in
		// order from lowest to highest
		var scopes = [];
		function checkScope(scope) {
			if (!scope.range || (scope.range[0] <= offset && scope.range[1] > offset)) {
				scopes.unshift(scope.variables);
				scope.scopes.forEach(checkScope);
			}
		}
		/*var vars = findVars(ast);
		delete vars.range; // the range for `Program` is off
		checkScope(vars);
		// make sure that these two are available in every function scope
		if (scopes.length > 1)
			scopes.splice(1, 0, ['this', 'arguments']);*/
		// add all the stdlib globals
		scopes.push(Object.keys(stdlib));

		// FIXME: remove duplicate code once we don’t need the ő hack any more
		var result = [];
		scopes.forEach(function (propnames) {
			result = result.concat(
				propnames.filter(function (name) {
					return !~result.indexOf(name);
					}).sort());
		});

		send(result);
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
