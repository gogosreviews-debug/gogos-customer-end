const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve package.json "exports" field (needed for socket.io-client v4)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
