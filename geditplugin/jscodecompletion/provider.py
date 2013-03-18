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
		# received_message is called in a different thread
		# so make sure that provider.do_result is called in the main thread
		GLib.idle_add(self.provider.do_result, results)

class CodeCompleteProvider(GObject.Object, GtkSource.CompletionProvider):
	def __init__(self, socket, manager):
		self.manager = manager
		socket = 'ws://localhost:%s' % socket
		self.client = CompleteClient(socket, manager, self)
		self.client.connect()
		GObject.Object.__init__(self)

	def do_get_name(self):
		return "JavaScript code completion"

	def analyze(self, iter):
		buffer = iter.get_buffer()
		file = buffer.get_location()
		if file == None:
			filename = None
		else:
			filename = file.get_path()
		(bufferstart, bufferend) = buffer.get_bounds()
		code = buffer.get_text(bufferstart, bufferend, False);
		self.client.send(json.dumps({'source': code, 'offset': iter.get_offset(), 'filename': filename}))

	def do_result(self, results):
		proposals = []
		for var in results:
			proposals.append(GtkSource.CompletionItem.new(var, var, None, None))
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

def dotBefore(iter):
	iter = iter.copy()
	if iter.get_char() == '.':
		return True
	iter.backward_char()
	while iter.get_char().isspace():
		if not iter.backward_char():
			break
	return iter.get_char() == '.'

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

