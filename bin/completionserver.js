#!/usr/bin/env node

var esprima = require('esprima'),
    lib = require('../'),
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

	var completer = new lib.Completion({
		source: source,
		filename: filename
	});
	send(completer.complete(offset));
});

rep.bind(sock, function () {
	console.log('listening on '+ sock);
});
