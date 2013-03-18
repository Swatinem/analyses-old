from gi.repository import GObject, Gedit
from provider import CodeCompleteProvider
from subprocess import Popen, PIPE
from ws4py.manager import WebSocketManager
import os

THISDIR = os.path.dirname(os.path.realpath(__file__))
SOCK = 7331

activeProviders = 0
analysisprocess = None
manager = WebSocketManager()

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
		global activeProviders, analysisprocess, manager
		activeProviders += 1
		if activeProviders == 1:
			manager.start()
			analysisprocess = Popen([THISDIR + '/js/bin/completionserver.js', str(SOCK)], stdin=PIPE, stdout=PIPE, stderr=PIPE)
			analysisprocess.stdout.readline()
		completion = self.view.get_completion()
		self.provider = CodeCompleteProvider(SOCK, manager)
		completion.add_provider(self.provider)

	def do_deactivate(self):
		global activeProviders, analysisprocess, manager
		if self.provider != None:
			completion = self.view.get_completion()
			completion.remove_provider(self.provider)
			self.provider = None
			activeProviders -= 1
			if activeProviders == 0:
				manager.close_all()
				manager.stop()
				manager.join()
				manager = None
				analysisprocess.kill()
				analysisprocess = None

