/* Metro config — monorepo-aware (npm workspaces) + NativeWind. */
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Dedupe React across the workspace: the Next.js app at the root ships its own
// react/react-dom (Tailwind v4 pins them differently), which Metro would
// otherwise resolve for some modules — producing the "Invalid hook call /
// two copies of React" crash, especially on web. Pin to the mobile copy.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native-web': path.resolve(workspaceRoot, 'node_modules/react-native-web'),
}

module.exports = withNativeWind(config, { input: './global.css' })
