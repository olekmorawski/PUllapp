import { Image } from 'expo-image';
import { View, Text, ScrollView, Platform } from 'react-native';

export default function HomeScreen() {
    return (
        <ScrollView className="flex-1 bg-white">
            {/* Header with image */}
            <View className="h-48 bg-blue-200 relative">
                <Image
                    source={require('@/assets/images/partial-react-logo.png')}
                    className="h-[178px] w-[290px] absolute bottom-0 left-0"
                />
            </View>

            {/* Content */}
            <View className="p-4">
                {/* Title */}
                <View className="flex-row items-center gap-2 mb-6">
                    <Text className="text-3xl font-bold text-gray-800">Welcome!</Text>
                    <Text className="text-2xl">👋</Text>
                </View>

                {/* Step 1 */}
                <View className="gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
                    <Text className="text-xl font-semibold text-blue-600">Step 1: Try it</Text>
                    <Text className="text-gray-700">
                        Edit <Text className="font-semibold">app/(tabs)/index.tsx</Text> to see changes.
                        Press{' '}
                        <Text className="font-semibold">
                            {Platform.select({
                                ios: 'cmd + d',
                                android: 'cmd + m',
                                web: 'F12',
                            })}
                        </Text>{' '}
                        to open developer tools.
                    </Text>
                </View>

                {/* Step 2 */}
                <View className="gap-2 mb-4 p-4 bg-green-50 rounded-lg">
                    <Text className="text-xl font-semibold text-green-600">Step 2: Explore</Text>
                    <Text className="text-gray-700">
                        Tap the Explore tab to learn more about what's included in this starter app.
                    </Text>
                </View>

                {/* Step 3 */}
                <View className="gap-2 mb-4 p-4 bg-purple-50 rounded-lg">
                    <Text className="text-xl font-semibold text-purple-600">Step 3: Get a fresh start</Text>
                    <Text className="text-gray-700">
                        When you're ready, run{' '}
                        <Text className="font-semibold">npm run reset-project</Text> to get a fresh{' '}
                        <Text className="font-semibold">app</Text> directory. This will move the current{' '}
                        <Text className="font-semibold">app</Text> to{' '}
                        <Text className="font-semibold">app-example</Text>.
                    </Text>
                </View>

                {/* Tailwind Test Section */}
                <View className="gap-2 mb-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                    <Text className="text-xl font-semibold text-yellow-600">🎨 Tailwind Test</Text>
                    <Text className="text-gray-700">
                        This component is now using Tailwind CSS! Try changing the colors, spacing, or typography.
                    </Text>
                    <View className="flex-row gap-2 mt-2">
                        <View className="h-4 w-4 bg-red-500 rounded-full" />
                        <View className="h-4 w-4 bg-blue-500 rounded-full" />
                        <View className="h-4 w-4 bg-green-500 rounded-full" />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}