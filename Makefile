.PHONY: test release

test:
	npm test

release:
ifeq ($(strip $(version)),)
	@echo "\033[31mERROR:\033[0;39m No version provided."
	@echo "\033[1;30mmake release version=1.0.0\033[0;39m"
else
ifneq ($(shell git diff --stat),)
	@echo "Changes must be committed before running a release"
endif
	rm -rf node_modules
	npm install
	make test
	npm version $(version)
	npm publish
	git push origin master
	git push origin --tags
endif
