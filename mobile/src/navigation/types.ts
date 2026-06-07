import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AppointmentsStackParamList = {
  AppointmentsList: undefined;
  AppointmentDetail: { id: string };
};

export type HomeStackParamList = {
  Dashboard: undefined;
};

export type RootTabsParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Appointments: NavigatorScreenParams<AppointmentsStackParamList>;
  Records: undefined;
  Notifications: undefined;
  Profile: undefined;
};
