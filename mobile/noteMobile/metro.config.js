const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force resolving zustand imports to their CommonJS versions
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('zustand')) {
    const result = require.resolve(moduleName);
    return context.resolveRequest(context, result, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
