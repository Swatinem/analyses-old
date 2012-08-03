LIB_FILES := $(shell find lib/ -type f -name '*.js')
TEST_FILES := $(shell find test/ -type f -name '*.js')

test:
	@./node_modules/.bin/mocha -r should

.PHONY: test coverage

coverage: coverage.html

coverage.html: $(LIB_FILES) $(TEST_FILES)
	@jscoverage lib lib-cov
	@ANALYSIS_COV=1 ./node_modules/.bin/mocha -r should -R html-cov > coverage.html || true
	@rm -rf lib-cov
