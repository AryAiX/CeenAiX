import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Push notifications registration STUB.
//
// This requests permission and obtains an Expo push token so the wiring is in
// place, but it does NOT ship production credentials (APNs key / FCM server
// key) and does not yet persist the token or deliver real pushes. Delivery of
// appointment / message / lab-result notifications is Phase 2 work tracked in
// docs/mobile/checklist.md (section 1.8). Safe to call on app start.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    // TODO(Phase 2): persist tokenResponse.data against the patient profile and
    // wire server-side delivery once APNs/FCM credentials are provisioned.
    return tokenResponse.data;
  } catch (error) {
    console.warn('[CeenAiX] Push registration stub skipped:', error);
    return null;
  }
}
