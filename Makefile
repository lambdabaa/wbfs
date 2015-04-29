JS_FILES := $(shell find lib/ -name "*.js")
NODE_VERSION := $(shell node -v)

webfs.js: index.js $(JS_FILES) node_modules
	./node_modules/.bin/browserify --standalone wbfs index.js > wbfs.js

node_modules: package.json
	npm install

.PHONY: test
test: node_modules
	@echo "Checking node version... $(NODE_VERSION)"
ifneq ($(NODE_VERSION),v1.8.1)
	$(error required node.js@v1.8.1)
endif
	./node_modules/.bin/mocha test/unit
