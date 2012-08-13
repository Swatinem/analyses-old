# coding=utf8
from gi.repository import GObject, GtkSource
import json
import zmq

class CodeCompleteProvider(GObject.Object, GtkSource.CompletionProvider):
	def __init__(self, socket, context):
		self.socket = context.socket(zmq.REQ)
		self.socket.connect(socket)
		self.lastIdentifier = None
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
		self.socket.send_json({'source': code, 'offset': iter.get_offset(), 'filename': filename})
		result = json.loads(self.socket.recv())
		if type(result) == dict and 'error' in result:
			print result
			return []
		else:
			return result

	def do_populate(self, context):
		iter = context.get_iter()
		
		[start, end] = findIdentifier(context.get_iter())
		text = start.get_text(end)
		
		# do not start interactive with identifiers < 2
		if (context.get_activation() == GtkSource.CompletionActivation.INTERACTIVE
		    and len(text) < 2):
			context.add_proposals(self, [], True)
			return

		# do not rescan if we are still typing the same identifier as on the last
		# request
		if self.lastIdentifier == None or not start.equal(self.lastIdentifier):
			#self.lastIdentifier = start;
			self.lastResult = self.analyze(iter)
		result = self.lastResult
		
		"""
		# do not start interactive if the typed word is inside the completion list
		if (context.get_activation() == GtkSource.CompletionActivation.INTERACTIVE
		    and text in result):
			context.add_proposals(self, [], True)
			return
		"""

		proposals = []
		vars = [var for var in result if text in var and text != var]
		for var in vars:
			proposals.append(GtkSource.CompletionItem.new(var, var, None, None))

		context.add_proposals(self, proposals, True)

	
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

