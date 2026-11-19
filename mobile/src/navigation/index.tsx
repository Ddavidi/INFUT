// Root Navigator
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { PeladaDetailsScreen } from '../screens/pelada/PeladaDetailsScreen';
import { ManageMembersScreen } from '../screens/pelada/ManageMembersScreen';
import { LivePeladaScreen } from '../screens/pelada/LivePeladaScreen';
import { PostGameScreen } from '../screens/pelada/PostGameScreen';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../constants/theme';

export type AppStackParamList = {
  MainTabs: undefined;
  PeladaDetails: { peladaId: string };
  ManageMembers: { peladaId: string };
  LivePelada: { peladaId: string; openConfigOnStart?: boolean };
  PostGame: { peladaId: string };
};

const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthenticatedStack() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabs} />
      <AppStack.Screen name="PeladaDetails" component={PeladaDetailsScreen} />
      <AppStack.Screen name="ManageMembers" component={ManageMembersScreen} />
      <AppStack.Screen name="LivePelada" component={LivePeladaScreen} />
      <AppStack.Screen name="PostGame" component={PostGameScreen} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AuthenticatedStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
