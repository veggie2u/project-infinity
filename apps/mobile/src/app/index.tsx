import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@project-infinity/ui'

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 items-center justify-center gap-4">
        <Text className="text-3xl font-semibold">project-infinity</Text>
        <Text className="text-gray-500">Mobile app scaffold — apps/mobile</Text>
        <Button>Hello, HeroUI Native</Button>
      </View>
    </SafeAreaView>
  )
}
