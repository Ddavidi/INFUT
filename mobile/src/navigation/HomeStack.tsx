import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FeedScreen } from '../screens/home/FeedScreen';
import { PeladaDetailsScreen } from '../screens/pelada/PeladaDetailsScreen';
import { PeladaMapScreen } from '../screens/pelada/PeladaMapScreen';

const Stack = createNativeStackNavigator();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="PeladaDetails" component={PeladaDetailsScreen} />
      <Stack.Screen 
        name="PeladaMap" 
        component={PeladaMapScreen} 
        options={{ title: 'Mapa' }} 
      />
    </Stack.Navigator>
  );
}
