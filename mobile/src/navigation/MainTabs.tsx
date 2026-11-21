// Main Tabs Navigator — Night Pitch Design System with Vector Icons
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { FeedScreen } from '../screens/home/FeedScreen';
import { ExploreScreen } from '../screens/home/ExploreScreen';
import { RankingScreen } from '../screens/home/RankingScreen';
import { CreatePeladaScreen } from '../screens/pelada/CreatePeladaScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { colors, fonts, borderRadius, spacing, themed } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const { isDesktop } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        tabBarStyle: isDesktop
          ? {
              width: 236,
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              borderRightWidth: 1,
              borderTopWidth: 0,
              paddingTop: spacing.xl,
              paddingBottom: spacing.lg,
              paddingHorizontal: spacing.md - 4,
            }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: Platform.OS === 'ios' ? 82 : 72,
              paddingTop: 8,
              paddingBottom: Platform.OS === 'ios' ? 22 : 12,
            },
        tabBarItemStyle: isDesktop
          ? {
              borderRadius: borderRadius.md,
              marginBottom: spacing.xs + 2,
              paddingHorizontal: spacing.sm + 4,
              minHeight: 48,
              justifyContent: 'flex-start',
            }
          : {
              borderRadius: borderRadius.md,
            },
        tabBarLabelStyle: isDesktop
          ? {
              fontSize: fonts.sizes.sm,
              fontWeight: '700',
              marginLeft: spacing.sm + 2,
              letterSpacing: -0.1,
            }
          : {
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.1,
              marginTop: 2,
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'football' : 'football-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Explorar"
        component={ExploreScreen}
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Nova Pelada"
        component={CreatePeladaScreen}
        options={{
          title: 'Criar',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.createIconWrap, focused && styles.createIconWrapActive]}>
              <Ionicons
                name="add"
                size={20}
                color={focused ? colors.textInverse : color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'trophy' : 'trophy-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={EditProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = themed(() => StyleSheet.create({
  createIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIconWrapActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
}));
