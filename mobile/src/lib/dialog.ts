import { Alert, Platform, type AlertButton } from 'react-native';

// `Alert.alert` is a no-op in react-native-web, so on web dialogs and action
// sheets render through <DialogHost /> instead. Native keeps the system UI.

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  sheet: boolean;
}

type Listener = (request: DialogRequest | null) => void;

let current: DialogRequest | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener(current));

export function subscribeDialog(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function resolveDialog(button: DialogButton | null): void {
  current = null;
  emit();
  button?.onPress?.();
}

export function presentWebDialog(title: string, message: string | undefined, buttons: DialogButton[], sheet = false): void {
  current = {
    id: nextId++,
    title,
    message,
    buttons: buttons.length > 0 ? buttons : [{ text: 'OK' }],
    sheet,
  };
  emit();
}

/** Drop-in for `Alert.alert` that also works on web. */
export function alertDialog(title: string, message?: string, buttons: DialogButton[] = []): void {
  if (Platform.OS === 'web') {
    presentWebDialog(title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons as AlertButton[]);
}
