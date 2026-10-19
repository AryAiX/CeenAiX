import i18n from 'i18next';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** Native action sheet on iOS; an Alert with buttons on Android. */
export function showActionSheet(title: string | undefined, actions: SheetAction[]): void {
  const cancel = i18n.t('m.common.cancel');
  if (Platform.OS === 'ios') {
    const destructive = actions.findIndex((action) => action.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), cancel],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: destructive >= 0 ? destructive : undefined,
      },
      (index) => actions[index]?.onPress()
    );
    return;
  }
  Alert.alert(title ?? '', undefined, [
    ...actions.map((action) => ({
      text: action.label,
      style: action.destructive ? ('destructive' as const) : ('default' as const),
      onPress: action.onPress,
    })),
    { text: cancel, style: 'cancel' as const },
  ]);
}
