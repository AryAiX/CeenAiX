// The app shares platform-agnostic web code (`../src/types`, `../src/locales`
// and a small allow-list of pure helpers in `../src/lib`) through the
// `@ceenaix/*` tsconfig aliases. Metro must watch those folders, and every
// bare import (e.g. `i18next` used by a shared helper) must resolve to the
// mobile app's own node_modules so there is exactly one i18next instance.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const webSrc = path.resolve(projectRoot, '..', 'src');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.join(webSrc, 'types'),
  path.join(webSrc, 'locales'),
  path.join(webSrc, 'lib'),
];

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
