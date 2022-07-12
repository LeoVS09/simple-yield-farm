#!/usr/bin/env make

.PHONY: build clean test


default:
	make clean && make build

install:
	forge install

# Build contracts
build:
	forge build

# Remove build artifacts
clean:
	forge clean

# Test contracts with stacktrace
# more 'v' increase amount of traces min 1 max 5
test:
	forge test -vvv

# Test without stacktrace
test-silent:
	forge test

# Run more fuzz tests
test-fuzz:
	forge test -v --fuzz-runs 1000

# Rerun tests when files changed
dev:
	forge test --watch

# Debug contract interactivly
debug:
	forge test --debug testComplex

# Deploy contracts
deploy:
	forge create DappStarter
