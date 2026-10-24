
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  View,
} from 'react-native';

import {
  NavigationContainer,
  useFocusEffect,
  createNavigationContainerRef,
} from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

// =====================================
// SERVICES
// =====================================

import { getStoredUser } from '../services/authService';
import {onSessionExpired} from '../services/api';

// =====================================
// MAIN SCREENS
// =====================================

import HomeScreen from '../screens/HomeScreen';
import SellerHomeScreen from '../screens/SellerHomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoriteScreen from '../screens/FavoriteScreen';

import AppointmentScreen from '../screens/AppointmentScreen';
import SellerAppointmentScreen from '../screens/SellerAppointmentScreen';

import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

import PropertyDetailScreen from '../screens/PropertyDetailScreen';

// =====================================
// CHAT
// =====================================

import ChatScreen from '../screens/ChatScreen';

// =====================================
// AUTH
// =====================================

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// =====================================
// PRIVACY
// =====================================

import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

// =====================================
// ROOM CUSTOMIZER
// =====================================

import RoomCustomizerScreen from '../screens/RoomCustomizerScreen';

// =====================================
// MY DESIGNS
// =====================================

import MyDesignsScreen from '../screens/MyDesignsScreen';
import DesignPriceSummaryScreen from '../screens/DesignPriceSummaryScreen';
import SharedDesignScreen from '../screens/SharedDesignScreen';

// =====================================
// APPOINTMENT
// =====================================

import CreateAppointmentScreen from '../screens/CreateAppointmentScreen';

// =====================================
// NOTIFICATION
// =====================================

import NotificationScreen from '../screens/NotificationScreen';

// =====================================
// PURCHASE OFFERS (NEW)
// =====================================

import CreateOfferScreen from '../screens/CreateOfferScreen';
import MyOffersScreen from '../screens/MyOffersScreen';

// =====================================
// NAVIGATORS
// =====================================

const navigationRef = createNavigationContainerRef();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// =====================================
// TAB OPTIONS
// =====================================

const tabScreenOptions = {
  headerShown: false,

  tabBarActiveTintColor: '#0F9D8A',
  tabBarInactiveTintColor: '#94A3B8',

  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  tabBarStyle: {
    height: 70,
    paddingTop: 7,
    paddingBottom: 7,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
  },
};

// =====================================
// LOADING SCREEN
// =====================================

const RoleLoadingScreen = () => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <ActivityIndicator
        size="large"
        color="#0F9D8A"
      />
    </View>
  );
};

// =====================================
// MAIN TABS
// =====================================

const MainTabs = () => {
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // =====================================
  // LOAD USER ROLE
  // =====================================

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadUserRole = async () => {
        try {
          setRoleLoading(true);

          const user = await getStoredUser();

          if (!active) return;

          console.log('CURRENT USER:', user);
          console.log('CURRENT ROLE:', user?.role);

          setUserRole(user?.role || null);
        } catch (error) {
          console.log('LOAD USER ROLE ERROR:', error);

          if (active) {
            setUserRole(null);
          }
        } finally {
          if (active) {
            setRoleLoading(false);
          }
        }
      };

      loadUserRole();

      return () => {
        active = false;
      };
    }, []),
  );

  if (roleLoading) {
    return <RoleLoadingScreen />;
  }

  // =====================================
  // SELLER TABS
  // =====================================

  if (userRole === 'seller') {
    return (
      <Tab.Navigator screenOptions={tabScreenOptions}>

        {/* SELLER HOME */}
        <Tab.Screen
          name="Home"
          component={SellerHomeScreen}
          options={{
            tabBarLabel: 'หน้าหลัก',

            tabBarIcon: ({ color, size, focused }) => (
              <MaterialDesignIcons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* MESSAGES */}
        <Tab.Screen
          name="Messages"
          component={MessagesScreen}
          options={{
            tabBarLabel: 'ข้อความ',

            tabBarIcon: ({ color, size, focused }) => (
              <MaterialDesignIcons
                name={
                  focused
                    ? 'message-text'
                    : 'message-text-outline'
                }
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* SELLER APPOINTMENTS */}
        <Tab.Screen
          name="Appointment"
          component={SellerAppointmentScreen}
          options={{
            tabBarLabel: 'นัดหมาย',

            tabBarIcon: ({ color, size, focused }) => (
              <MaterialDesignIcons
                name={
                  focused
                    ? 'calendar'
                    : 'calendar-outline'
                }
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* PROFILE */}
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'โปรไฟล์',

            tabBarIcon: ({ color, size, focused }) => (
              <MaterialDesignIcons
                name={
                  focused
                    ? 'account'
                    : 'account-outline'
                }
                size={size}
                color={color}
              />
            ),
          }}
        />

      </Tab.Navigator>
    );
  }

  // =====================================
  // BUYER / GUEST TABS
  // =====================================

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>

      {/* HOME */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'หน้าหลัก',

          tabBarIcon: ({ color, size, focused }) => (
            <MaterialDesignIcons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* SEARCH */}
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'ค้นหา',

          tabBarIcon: ({ color, size }) => (
            <MaterialDesignIcons
              name="magnify"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* MESSAGES */}
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'ข้อความ',

          tabBarIcon: ({ color, size, focused }) => (
            <MaterialDesignIcons
              name={
                focused
                  ? 'message-text'
                  : 'message-text-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* PROFILE */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'โปรไฟล์',

          tabBarIcon: ({ color, size, focused }) => (
            <MaterialDesignIcons
              name={
                focused
                  ? 'account'
                  : 'account-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

    </Tab.Navigator>
  );
};

// =====================================
// ROOT NAVIGATOR
// =====================================

const AppNavigator = () => {
  useEffect(() => onSessionExpired(() => {
    if (navigationRef.isReady()) navigationRef.resetRoot({index:0,routes:[{name:'Login'}]});
  }), []);
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
        }}>

        {/* =================================
            MAIN TABS
        ================================= */}

        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />

        {/* =================================
            AUTHENTICATION
        ================================= */}

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        {/* =================================
            PRIVACY
        ================================= */}

        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
        />

        {/* =================================
            PROPERTY DETAILS
        ================================= */}

        <Stack.Screen
          name="PropertyDetail"
          component={PropertyDetailScreen}
        />

        {/* =================================
            FAVORITES
        ================================= */}

        <Stack.Screen
          name="Favorite"
          component={FavoriteScreen}
        />

        {/* =================================
            BUYER APPOINTMENTS
        ================================= */}

        <Stack.Screen
          name="BuyerAppointment"
          component={AppointmentScreen}
        />

        <Stack.Screen
          name="CreateAppointment"
          component={CreateAppointmentScreen}
        />

        {/* =================================
            ROOM CUSTOMIZER 2D
        ================================= */}

        <Stack.Screen
          name="RoomCustomizer"
          component={RoomCustomizerScreen}
        />

<Stack.Screen name="DesignPriceSummary" component={DesignPriceSummaryScreen} />
<Stack.Screen name="SharedDesign" component={SharedDesignScreen} />

        {/* =================================
            MY DESIGNS
        ================================= */}

        <Stack.Screen
          name="MyDesigns"
          component={MyDesignsScreen}
        />

        {/* =================================
            CHAT
        ================================= */}

        <Stack.Screen
          name="Chat"
          component={ChatScreen}
        />

        {/* =================================
            NOTIFICATIONS
        ================================= */}

        <Stack.Screen
          name="Notification"
          component={NotificationScreen}
        />

        {/* =================================
            PURCHASE OFFERS (NEW)
        ================================= */}

        {/* ส่งข้อเสนอซื้อบ้าน */}
        <Stack.Screen
          name="CreateOffer"
          component={CreateOfferScreen}
          options={{
            headerShown: true,
            title: 'เสนอราคาซื้อบ้าน',
            headerTintColor: '#111638',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />

        {/* ข้อเสนอซื้อของฉัน */}
        <Stack.Screen
          name="MyOffers"
          component={MyOffersScreen}
          options={{
            headerShown: true,
            title: 'ข้อเสนอซื้อของฉัน',
            headerTintColor: '#111638',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
