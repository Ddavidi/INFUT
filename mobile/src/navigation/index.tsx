// Root Navigator — Night Pitch Dark Theme & Smooth Transitions
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
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

const InfutNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.primary,
  },
};

function AuthenticatedStack() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade_from_bottom',
      }}
    >
      <AppStack.Screen name="MainTabs" component={MainTabs} />
      <AppStack.Screen
        name="PeladaDetails"
        component={PeladaDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AppStack.Screen
        name="ManageMembers"
        component={ManageMembersScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AppStack.Screen
        name="LivePelada"
        component={LivePeladaScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
      <AppStack.Screen
        name="PostGame"
        component={PostGameScreen}
        options={{ animation: 'fade_from_bottom' }}
      />
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
    <NavigationContainer theme={InfutNavTheme}>
      {isAuthenticated ? <AuthenticatedStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
