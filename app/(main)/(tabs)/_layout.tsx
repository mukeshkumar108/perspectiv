import { Tabs } from 'expo-router/js-tabs';
import { BluumTabBar } from '@/src/components/BluumTabBar';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BluumTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="moments" options={{ title: 'Moments' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="games" options={{ href: null }} />
      <Tabs.Screen name="skia-lab" options={{ href: null }} />
      <Tabs.Screen name="character-lab" options={{ href: null }} />
    </Tabs>
  );
}
