// Metro config for the CeenAiX mobile app.
//
// Two concerns are wired here:
//   1. NativeWind — Tailwind class compilation via `global.css`.
//   2. Shared-code reuse — the app imports platform-agnostic modules from
//      the web codebase (`../src/types`, `../src/locales`) using the
//      `@ceenaix/*` aliases. Metro must be allowed to watch and resolve
//      files that live outside the `mobile/` folder.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the web `src/` so changes to shared types/locales hot-reload.
config.watchFolders = [path.resolve(repoRoot, 'src')];

// Resolve the shared aliases used in tsconfig `paths`.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@ceenaix/types': path.resolve(repoRoot, 'src/types'),
  '@ceenaix/locales': path.resolve(repoRoot, 'src/locales'),
};

// Prefer the mobile app's own node_modules; fall back to the repo root only
// if a dependency is hoisted there.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(repoRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
