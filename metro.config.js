const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    try {
        const problematicPackages = [
            '@noble/hashes',
            '@noble/curves',
            '@noble/secp256k1',
            '@dynamic-labs',
            'viem',
            'abitype',
            '@adraffy/ens-normalize'
        ];

        if (problematicPackages.some(pkg => moduleName.startsWith(pkg))) {
            return context.resolveRequest(
                {
                    ...context,
                    unstable_enablePackageExports: false,
                },
                moduleName,
                platform
            );
        }

        if (moduleName.includes('async-require.js')) {
            return {
                type: 'empty',
            };
        }

        if (moduleName === 'crypto') {
            return context.resolveRequest(
                context,
                'react-native-quick-crypto',
                platform
            );
        }

        if (moduleName === '@noble/hashes/crypto.js') {
            return context.resolveRequest(
                context,
                'react-native-get-random-values',
                platform
            );
        }

        if (moduleName.endsWith('.js')) {
            const tsModuleName = moduleName.replace(/\.js$/, '.ts');
            try {
                return context.resolveRequest(context, tsModuleName, platform);
            } catch (tsError) {
            }
        }

        return context.resolveRequest(context, moduleName, platform);
    } catch (error) {
        try {
            return context.resolveRequest(
                {
                    ...context,
                    unstable_enablePackageExports: false,
                },
                moduleName,
                platform
            );
        } catch (fallbackError) {
            throw error;
        }
    }
};

config.resolver.sourceExts.push('mjs');

config.resolver.platforms = ['native', 'react-native', 'web', 'ios', 'android'];

config.resolver.blockList = [
    /.*\/async-require\.js$/,
    /.*\/metro.*\/async-require\.js$/,
];

module.exports = withNativeWind(config, { input: './global.css' });