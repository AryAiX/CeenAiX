// Metro config for the CeenAiX mobile app.
//
// NativeWind compiles Tailwind classes via `global.css`. The mobile app also
// keeps the repo root visible to Metro for future shared runtime modules.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the repo root so shared files outside `mobile/` can be resolved during
// production export as well as local development.
config.watchFolders = [repoRoot];

// Resolve the shared aliases used in tsconfig `paths`.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@ceenaix/types': path.resolve(repoRoot, 'src/types'),
};

// Prefer the mobile app's own node_modules; fall back to the repo root only
// if a dependency is hoisted there.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(repoRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
