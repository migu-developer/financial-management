/* eslint-disable @typescript-eslint/no-require-imports */
// require() is intentional here: Node.js 24 treats .ts files with `import`
// as native ESM, which breaks Metro's module resolution. CJS require() keeps
// the correct resolver behaviour expected by Expo's Metro config loader.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './styles/global.css' });
