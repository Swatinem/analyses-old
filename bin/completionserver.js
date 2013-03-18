#!/usr/bin/env node

var esprima = require('esprima')
  , lib = require('../')
  , WebSocketServer = require('ws').Server
  , http = require('http');

var sock = process.argv[2];
if (!sock) {
	console.error('need to provide socket to listen on');
	process.exit(1);
}

var server = http.createServer();
var wss = new WebSocketServer({server: server});

wss.on('connection', function(ws) {
	ws.on('message', function(message) {
		var msg = JSON.parse(message);
		var source = msg.source || '';
		var offset = msg.offset || 0;
		var filename = msg.filename;

		var completer = new lib.Completion({
			source: source,
			filename: filename
		});
		var results = completer.complete(offset);
		ws.send(JSON.stringify(results));
	});
});

server.listen(sock, function () {
	console.log('Listening on %s', sock);
});
