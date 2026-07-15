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
// react/react-dom, and a module resolving that copy while react-native-web
// initialized the mobile copy crashes with "Invalid hook call / two copies of
// React". extraNodeModules is only a FALLBACK (it can't override a successful
// resolution), so force it with a custom resolver: every react/react-dom/
// scheduler request — from any importer — resolves to the mobile copy.
const FORCE_SINGLETON = ['react', 'react-dom', 'scheduler']
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pkg = moduleName.split('/')[0]
  if (FORCE_SINGLETON.includes(pkg)) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [projectRoot] }),
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
