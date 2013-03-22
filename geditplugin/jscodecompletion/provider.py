# coding=utf8
from gi.repository import GObject, GtkSource, GLib
from ws4py.client import WebSocketBaseClient
import json
import types

class CompleteClient(WebSocketBaseClient):
	def __init__(self, socket, manager, provider):
		self.manager = manager
		self.provider = provider
		WebSocketBaseClient.__init__(self, socket)
	def handshake_ok(self):
		self.manager.add(self)
	def received_message(self, msg):
		results = json.loads(str(msg))
		if type(results) == dict and 'error' in results:
			results = [] # TODO: we don’t handle any errors yet
		# received_message is called in a different thread
		# so make sure that provider.do_result is called in the main thread
		GLib.idle_add(self.provider.do_result, results)

class CodeCompleteProvider(GObject.Object, GtkSource.CompletionProvider):
	def __init__(self, socket, manager, view):
		self.manager = manager
		socket = 'ws://localhost:%s' % socket
		self.client = CompleteClient(socket, manager, self)
		self.client.connect()
		self.view = view
		self.connect_buffer()
		GObject.Object.__init__(self)

	def connect_buffer(self):
		buffer = self.view.get_buffer()
		send = lambda o: self.client.send(json.dumps(o))
		# connect the buffer change events
		def delete_range(buffer, start, end):
			start = start.get_offset()
			send({
				'type': 'change',
				'offset': start,
				'remove': end.get_offset() - start,
				'add': ''
			})
		buffer.connect('delete-range', delete_range)
		def insert_text(buffer, offset, text, length):
			send({
				'type': 'change',
				'offset': offset.get_offset(),
				'remove': 0,
				'add': text
			})
		buffer.connect('insert-text', insert_text)
		# and send off the initial buffer
		file = buffer.get_location()
		if file == None:
			filename = None
		else:
			filename = file.get_path()
		(bufferstart, bufferend) = buffer.get_bounds()
		code = buffer.get_text(bufferstart, bufferend, False);
		send({
			'type': 'new',
			'source': code,
			'filename': filename
		});

	def do_get_name(self):
		return "JavaScript code completion"

	def analyze(self, iter):
		self.client.send(json.dumps({'type': 'complete', 'offset': iter.get_offset()}))

	def do_result(self, results):
		proposals = []
		for res in results:
			proposals.append(GtkSource.CompletionItem.new_with_markup(res['markup'], res['identifier'], None, res['info']))
		# FIXME: there are still assertions like
		# GtkSourceView-CRITICAL **: _gtk_source_completion_add_proposals: assertion `completion->priv->context == context' failed
		self.context.add_proposals(self, proposals, True)

	def do_populate(self, context):
		self.context = context
		iter = context.get_iter()
		
		[start, end] = findIdentifier(context.get_iter())
		text = start.get_text(end)
		
		# do not start interactive with identifiers < 2
		if (context.get_activation() == GtkSource.CompletionActivation.INTERACTIVE
		    and len(text) < 2):
			context.add_proposals(self, [], True)
			return

		self.analyze(iter)
		return

	#def do_get_start_iter(self, context, proposal, iter):
	#	[start, end] = findIdentifier(context.get_iter())
	#	if not start.equal(end):
	#		iter = start
	#	return True
	
	def do_activate_proposal(self, proposal, iter):
		[start, end] = findIdentifier(iter)
		if start.equal(end):
			start = iter
			end = iter
		buffer = iter.get_buffer()
		buffer.delete(start, end)
		buffer.insert(start, proposal.get_text())
		return True

def findIdentifier(iter):
	identifierchar = lambda char: (char.isdigit() or char.isalpha() or char == '$' or char == '_')

	start = iter.copy()
	start.backward_char()
	if not identifierchar(start.get_char()):
		return [start, start]
	
	end = iter.copy()
	while identifierchar(start.get_char()):
		if not start.backward_char():
			break
	while identifierchar(end.get_char()):
		if not end.forward_char():
			break
	if not identifierchar(start.get_char()):
		start.forward_char()
	return [start, end]

