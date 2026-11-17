// Main Tabs Navigator
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '../screens/home/FeedScreen';
import { ExploreScreen } from '../screens/home/ExploreScreen';
import { RankingScreen } from '../screens/home/RankingScreen';
import { CreatePeladaScreen } from '../screens/pelada/CreatePeladaScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { colors, fonts } from '../constants/theme';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 66,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: 'Peladas',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: fonts.sizes.lg, opacity: focused ? 1 : 0.7 }}>{'⚽'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Explorar"
        component={ExploreScreen}
        options={{
          title: 'Explorar',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: fonts.sizes.lg, opacity: focused ? 1 : 0.7 }}>{'🗺️'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Nova Pelada"
        component={CreatePeladaScreen}
        options={{
          title: 'Criar',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: fonts.sizes.lg, opacity: focused ? 1 : 0.7 }}>{'➕'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{
          title: 'Ranking',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: fonts.sizes.lg, opacity: focused ? 1 : 0.7 }}>{'🏆'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={EditProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: fonts.sizes.lg, opacity: focused ? 1 : 0.7 }}>{'👤'}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
