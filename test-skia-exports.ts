import * as Skia from "@shopify/react-native-skia";

console.log(
  "Available Skia exports:",
  Object.keys(Skia).filter((k) => k.includes("use")),
);
