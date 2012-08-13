from gi.repository import GObject, Gedit
from provider import CodeCompleteProvider
from subprocess import Popen, PIPE
import zmq
import os

THISDIR = os.path.dirname(os.path.realpath(__file__))
SOCK = 'ipc:///tmp/jscodecompletion.sock'

context = zmq.Context()

activeProviders = 0
analysisprocess = None

class CodeCompleteViewActivatable(GObject.Object, Gedit.ViewActivatable):
	view = GObject.property(type=Gedit.View)

	def __init__(self):
		GObject.Object.__init__(self)
		self.provider = None

	def do_activate(self):
		buffer = self.view.get_buffer()
		def on_language_change(obj, gparamstring):
			lang = buffer.get_language()
			if lang != None and lang.get_id() == 'js':
				self.enable()
			else:
				self.do_deactivate()
		buffer.connect("notify::language", on_language_change)
		on_language_change(None, None)

	def enable(self):
		global activeProviders, analysisprocess
		activeProviders += 1
		if activeProviders == 1:
			analysisprocess = Popen([THISDIR + '/js/bin/completionserver.js', SOCK], stdin=PIPE, stdout=PIPE, stderr=PIPE)
			analysisprocess.stdout.readline()
		completion = self.view.get_completion()
		self.provider = CodeCompleteProvider(SOCK, context)
		completion.add_provider(self.provider)

	def do_deactivate(self):
		global activeProviders, analysisprocess
		if self.provider != None:
			completion = self.view.get_completion()
			completion.remove_provider(self.provider)
			self.provider = None
			activeProviders -= 1
			if activeProviders == 0:
				analysisprocess.kill()
				analysisprocess = None

