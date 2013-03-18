from gi.repository import GObject, Gedit
from provider import CodeCompleteProvider
from subprocess import Popen, PIPE
from ws4py.manager import WebSocketManager
import os

THISDIR = os.path.dirname(os.path.realpath(__file__))
SOCK = 7331
DATA_KEY = 'JSComplete'

class CodeCompleteAppActivatable(GObject.Object, Gedit.AppActivatable):
	app = GObject.property(type=Gedit.App)

	def __init__(self):
		GObject.Object.__init__(self)

	def do_activate(self):
		self.analysis = Popen([THISDIR + '/js/bin/completionserver.js', str(SOCK)], stdin=PIPE, stdout=PIPE, stderr=PIPE)
		self.analysis.stdout.readline()
		self.manager = WebSocketManager()
		self.manager.start()
		self.app.set_data(DATA_KEY, self);

	def do_deactivate(self):
		self.analysis.kill()
		self.manager.close_all()
		self.manager.stop()
		self.manager.join()

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
		completion = self.view.get_completion()
		app = Gedit.App.get_default()
		self.provider = CodeCompleteProvider(SOCK, app.get_data(DATA_KEY).manager)
		completion.add_provider(self.provider)

	def do_deactivate(self):
		if self.provider != None:
			completion = self.view.get_completion()
			completion.remove_provider(self.provider)
			self.provider = None

