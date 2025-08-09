import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import Enable2FAScreen from './screens/auth/Enable2FAScreen';
import HomeScreen from './screens/HomeScreen';
import GameSelectScreen from './screens/GameSelectScreen';
import UnoScreen from './screens/uno/UnoScreen';
import WerewolfScreen from './screens/werewolf/WerewolfScreen';
import RummyScreen from './screens/rummy/RummyScreen';
import ProfileScreen from './screens/ProfileScreen';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function AuthedTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Accueil" component={HomeScreen} />
      <Tabs.Screen name="Jeux" component={GameSelectScreen} />
      <Tabs.Screen name="Profil" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function RootNav() {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={AuthedTabs} />
          <Stack.Screen name="Uno" component={UnoScreen} />
          <Stack.Screen name="Werewolf" component={WerewolfScreen} />
          <Stack.Screen name="Rummy" component={RummyScreen} />
          <Stack.Screen name="Enable2FA" component={Enable2FAScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNav />
        <StatusBar style="light" />
      </NavigationContainer>
    </AuthProvider>
  );
}
