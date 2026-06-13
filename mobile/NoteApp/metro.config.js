const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Zustand ESM dùng import.meta — Metro web không hỗ trợ, dùng bản CJS (.js)
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const subpath = moduleName === 'zustand' ? 'index.js' : `${moduleName.slice('zustand/'.length)}.js`;
    const filePath = path.join(__dirname, 'node_modules', 'zustand', subpath);

    if (fs.existsSync(filePath)) {
      return { type: 'sourceFile', filePath };
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
