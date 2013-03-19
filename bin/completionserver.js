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

wss.on('connection', function (ws) {
	var completer = null;
	function send(msg) {
		if (msg instanceof Error)
			return ws.send(JSON.stringify({error: msg.message}));
		ws.send(JSON.stringify(msg));
	}
	ws.on('message', function (message) {
		var msg;
		try {
			msg = JSON.parse(message);
		} catch (e) {
			return; // just silently ignore malformed json
		}
		var type = msg.type;
		try {
		switch (type) {
			case 'new':
				completer = new lib.Completion({
					source: msg.source || '',
					filename: msg.filename
				});
			break;
			case 'change':
				if (!completer)
					return send(new Error('Completer not initialized'));
				completer.splice(msg.offset, msg.remove, msg.add);
			break;
			case 'complete':
				if (!completer)
					return send(new Error('Completer not initialized'));
				send(completer.complete(msg.offset || 0));
			break;
			case undefined: // backwards compat, for now
				var source = msg.source || '';
				var offset = msg.offset || 0;
				var filename = msg.filename;

				completer = new lib.Completion({
					source: source,
					filename: filename
				});
				var results = completer.complete(offset);
				send(results.map(function (res) { return res.identifier; }));
			break;
		}
		} catch (e) {
			send(e);
		}
	});
});

server.listen(sock, function () {
	console.log('Listening on %s', sock);
});
