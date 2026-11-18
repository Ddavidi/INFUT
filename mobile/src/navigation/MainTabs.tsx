// Main Tabs Navigator
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '../screens/home/FeedScreen';
import { ExploreScreen } from '../screens/home/ExploreScreen';
import { RankingScreen } from '../screens/home/RankingScreen';
import { CreatePeladaScreen } from '../screens/pelada/CreatePeladaScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { colors, fonts, borderRadius, spacing } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const { isDesktop } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        tabBarStyle: isDesktop
          ? {
              width: 220,
              backgroundColor: colors.surface,
              borderRightColor: colors.borderLight,
              borderRightWidth: 1,
              borderTopWidth: 0,
              paddingTop: spacing.xl,
              paddingBottom: spacing.lg,
              paddingHorizontal: spacing.sm,
            }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.borderLight,
              borderTopWidth: 1,
              height: 66,
              paddingTop: 6,
              paddingBottom: 10,
            },
        tabBarItemStyle: isDesktop
          ? {
              borderRadius: borderRadius.md,
              marginBottom: spacing.xs + 2,
              paddingHorizontal: spacing.sm,
              minHeight: 48,
              justifyContent: 'flex-start',
            }
          : undefined,
        tabBarLabelStyle: isDesktop
          ? {
              fontSize: fonts.sizes.sm,
              fontWeight: '700',
              marginLeft: spacing.sm,
            }
          : {
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.2,
            },
        tabBarActiveBackgroundColor: isDesktop ? colors.primarySoft : undefined,
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
