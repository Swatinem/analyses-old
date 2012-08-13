install-plugin:
	npm install -d
	mkdir -p ~/.local/share/gedit/plugins/
	cp -a geditplugin/* ~/.local/share/gedit/plugins/
	cp -a ./ ~/.local/share/gedit/plugins/jscodecompletion/js/
	rm -r ~/.local/share/gedit/plugins/jscodecompletion/js/test
	rm -r ~/.local/share/gedit/plugins/jscodecompletion/js/geditplugin

test:
	@./node_modules/.bin/mocha -r should

.PHONY: test coverage

coverage:
	@jscoverage --no-highlight lib lib-cov
	@ANALYSIS_COV=1 ./node_modules/.bin/mocha -r should -R html-cov > coverage.html
	@rm -rf lib-cov
