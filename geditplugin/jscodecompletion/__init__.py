import os

from gi.repository import GObject, Gedit
from subprocess import Popen, PIPE
from ws4py.manager import WebSocketManager

from .provider import CodeCompleteProvider

THISDIR = os.path.dirname(os.path.realpath(__file__))
#SOCK = 7331
SOCK = THISDIR + '/ws.sock';

class CodeCompleteAppActivatable(GObject.Object, Gedit.AppActivatable):
	app = GObject.property(type=Gedit.App)

	def __init__(self):
		self.viewCount = 0
		self.analysis = None
		GObject.Object.__init__(self)

	def do_activate(self):
		self.app.app = self
	def do_deactivate(self):
		pass

	def start(self):
		self.analysis = Popen([THISDIR + '/js/bin/completionserver.js', str(SOCK)], stdin=PIPE, stdout=PIPE, stderr=PIPE)
		self.analysis.stdout.readline()
		self.manager = WebSocketManager()
		self.manager.start()

	def stop(self):
		self.analysis.kill()
		self.manager.close_all()
		self.manager.stop()
		self.manager.join()
		self.analysis = None
		self.manager = None

	def add_view(self):
		self.viewCount += 1
		if self.viewCount == 1 and self.analysis == None:
			self.start()
	def remove_view(self):
		self.viewCount -= 1
		if self.viewCount == 0:
			self.stop()

class CodeCompleteViewActivatable(GObject.Object, Gedit.ViewActivatable):
	view = GObject.property(type=Gedit.View)

	def __init__(self):
		GObject.Object.__init__(self)
		self.provider = None

	def app(self):
		app = Gedit.App.get_default().app
		return app

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
		self.app().add_view()
		completion = self.view.get_completion()
		self.provider = CodeCompleteProvider(SOCK, self.app().manager, self.view)
		completion.add_provider(self.provider)

	def do_deactivate(self):
		if self.provider != None:
			completion = self.view.get_completion()
			completion.remove_provider(self.provider)
			self.provider = None
			self.app().remove_view()

