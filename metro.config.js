const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add resolver configuration for crypto libraries
config.resolver.resolveRequest = (context, moduleName, platform) => {
    try {
        return context.resolveRequest(context, moduleName, platform);
    } catch (error) {
        // Handle .js to .ts resolution
        if (moduleName.endsWith('.js')) {
            const tsModuleName = moduleName.replace(/\.js$/, '.ts');
            try {
                return context.resolveRequest(context, tsModuleName, platform);
            } catch (tsError) {
                // Fall through to original error if .ts doesn't work
            }
        }

        // Handle noble-hashes crypto import issues
        if (moduleName === '@noble/hashes/crypto' || moduleName === '@noble/hashes/crypto.js') {
            try {
                return context.resolveRequest(context, '@noble/hashes/crypto.web.js', platform);
            } catch (webError) {
                try {
                    return context.resolveRequest(context, '@noble/hashes/utils.js', platform);
                } catch (utilsError) {
                    // Fall back to main entry
                    return context.resolveRequest(context, '@noble/hashes', platform);
                }
            }
        }

        // Handle async-require issues
        if (moduleName.includes('async-require.js')) {
            // Return a mock resolution or skip
            return {
                type: 'empty',
            };
        }

        throw error;
    }
};

// Add node module extensions
config.resolver.sourceExts.push('mjs');

// Add platform extensions for better resolution
config.resolver.platforms = ['native', 'react-native', 'web', 'ios', 'android'];

module.exports = withNativeWind(config, { input: './global.css' });