// Main Tabs Navigator
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '../screens/home/FeedScreen';
import { CreatePeladaScreen } from '../screens/pelada/CreatePeladaScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { colors } from '../constants/theme';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen} 
        options={{ tabBarIcon: () => <>{'\u26BD'}</> }} 
      />
      <Tab.Screen 
        name="Nova Pelada" 
        component={CreatePeladaScreen} 
        options={{ tabBarIcon: () => <>{'\u2795'}</> }} 
      />
      <Tab.Screen 
        name="Perfil" 
        component={EditProfileScreen} 
        options={{ tabBarIcon: () => <>{'\uD83D\uDC64'}</> }} 
      />
    </Tab.Navigator>
  );
}