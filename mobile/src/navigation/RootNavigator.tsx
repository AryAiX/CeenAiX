import { Ionicons } from '@expo/vector-icons';
import { DefaultTheme, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '../components/ui';
import { useAuth } from '../context/auth-context';
import { colors } from '../lib/theme';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { AppointmentDetailScreen } from '../screens/patient/AppointmentDetailScreen';
import { AppointmentsScreen } from '../screens/patient/AppointmentsScreen';
import { DashboardScreen } from '../screens/patient/DashboardScreen';
import { NotificationsScreen, RecordsScreen } from '../screens/patient/ComingSoonScreen';
import { ProfileScreen } from '../screens/patient/ProfileScreen';
import type {
  AppointmentsStackParamList,
  AuthStackParamList,
  HomeStackParamList,
  RootTabsParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AppointmentsStack = createNativeStackNavigator<AppointmentsStackParamList>();
const Tabs = createBottomTabNavigator<RootTabsParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand[600],
    background: colors.slate[50],
    card: colors.white,
    text: colors.slate[900],
    border: colors.slate[100],
  },
};

// Deep-link scaffold. `ceenaix://appointments/<id>` opens the detail screen;
// push-tap routing (Phase 2) reuses this config.
const linking: LinkingOptions<RootTabsParamList> = {
  prefixes: [Linking.createURL('/'), 'ceenaix://'],
  config: {
    screens: {
      Home: { screens: { Dashboard: 'dashboard' } },
      Appointments: {
        screens: { AppointmentsList: 'appointments', AppointmentDetail: 'appointments/:id' },
      },
      Records: 'records',
      Notifications: 'notifications',
      Profile: 'profile',
    },
  },
};

function AuthNavigator(): React.ReactElement {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator(): React.ReactElement {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
    </HomeStack.Navigator>
  );
}

function AppointmentsNavigator(): React.ReactElement {
  return (
    <AppointmentsStack.Navigator>
      <AppointmentsStack.Screen
        name="AppointmentsList"
        component={AppointmentsScreen}
        options={{ headerShown: false }}
      />
      <AppointmentsStack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
        options={{ title: 'Appointment' }}
      />
    </AppointmentsStack.Navigator>
  );
}

function TabsNavigator(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.slate[400],
        tabBarIcon: ({ color, size }) => {
          const iconByRoute: Record<keyof RootTabsParamList, keyof typeof Ionicons.glyphMap> = {
            Home: 'home-outline',
            Appointments: 'calendar-outline',
            Records: 'document-text-outline',
            Notifications: 'notifications-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={iconByRoute[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeNavigator} options={{ title: t('mobile.tabs.home') }} />
      <Tabs.Screen
        name="Appointments"
        component={AppointmentsNavigator}
        options={{ title: t('mobile.tabs.appointments') }}
      />
      <Tabs.Screen name="Records" component={RecordsScreen} options={{ title: t('mobile.tabs.records') }} />
      <Tabs.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('mobile.tabs.notifications') }}
      />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: t('mobile.tabs.profile') }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator(): React.ReactElement {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Route guard parity with the web `ProtectedRoute`: only an authenticated
  // patient reaches the app tabs; everyone else stays on the auth stack.
  const isPatient = isAuthenticated && role === 'patient';

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      {isPatient ? <TabsNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
