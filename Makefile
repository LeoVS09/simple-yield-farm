
default:; make clean && make build

# Build contracts
build    :; dapp build

# Remove build artifacts
clean  :; dapp clean

# Test contracts with stacktrace
test   :; dapp test -v

# Test without stacktrace
test-silent :; dapp test

# Run more fuzz tests
test-fuzz :; dapp test -v --fuzz-runs 1000

# Debug contract interactivly
debug  :; dapp debug

# Deploy contracts
deploy :; dapp create DappStarter
