export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertHandler = (
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
) => void;

let alertHandler: AlertHandler | null = null;

export const registerAlertHandler = (handler: AlertHandler | null) => {
  alertHandler = handler;
};

export const showAppAlert = (
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
) => {
  if (alertHandler) {
    alertHandler(title, message, buttons);
    return;
  }

  console.warn('[Alert] No alert handler registered', { title, message });
};
