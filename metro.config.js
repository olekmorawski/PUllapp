const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname)

config.resolver.resolveRequest = (context, moduleName, platform) => {
    try {
        return context.resolveRequest(context, moduleName, platform)
    } catch (error) {
        if (moduleName.endsWith('.js')) {
            const tsModuleName = moduleName.replace(/\.js$/, '.ts')
            return context.resolveRequest(context, tsModuleName, platform)
        }
        throw error
    }
}

module.exports = withNativeWind(config, { input: './global.css' })