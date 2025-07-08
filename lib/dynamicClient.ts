import { createClient } from "@dynamic-labs/client";
import { ReactNativeExtension } from "@dynamic-labs/react-native-extension";
import { ViemExtension } from "@dynamic-labs/viem-extension";
import { ZeroDevExtension } from "@dynamic-labs/zerodev-extension";

export const dynamicClient = createClient({
  environmentId: "76727abf-ff90-4981-ba7a-b3b014897e00",
  appLogoUrl: "https://demo.dynamic.xyz/favicon-32x32.png",
  appName: "Dynamic Demo",
})
    .extend(ReactNativeExtension())
    .extend(ViemExtension())
    .extend(ZeroDevExtension());
