import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fonts } from '../helpers/styles';
import { AppAlertButton, registerAlertHandler } from '../services/appAlert';

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

const defaultButtons: AppAlertButton[] = [{ text: 'OK' }];

export const AppAlertProvider = ({ children }: PropsWithChildren) => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: defaultButtons,
  });

  useEffect(() => {
    registerAlertHandler((title, message, buttons) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons?.length ? buttons : defaultButtons,
      });
    });

    return () => registerAlertHandler(null);
  }, []);

  const closeAlert = (button?: AppAlertButton) => {
    setAlertState(prev => ({ ...prev, visible: false }));

    if (button?.onPress) {
      setTimeout(() => {
        button.onPress?.();
      }, 120);
    }
  };

  const isSingleButton = useMemo(() => alertState.buttons.length === 1, [alertState.buttons.length]);

  return (
    <>
      {children}
      <Modal
        visible={alertState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => closeAlert()}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => closeAlert()} />
          <View style={styles.dialog}>
            <View style={styles.accentBar} />
            <Text style={styles.title}>{alertState.title}</Text>
            {!!alertState.message && <Text style={styles.message}>{alertState.message}</Text>}

            <View style={[styles.buttonRow, isSingleButton && styles.buttonRowSingle]}>
              {alertState.buttons.map(button => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';

                return (
                  <TouchableOpacity
                    key={`${button.text}-${button.style ?? 'default'}`}
                    style={[
                      styles.button,
                      isSingleButton && styles.buttonSingle,
                      isCancel && styles.buttonCancel,
                      isDestructive && styles.buttonDestructive,
                    ]}
                    onPress={() => closeAlert(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel && styles.buttonTextCancel,
                        isDestructive && styles.buttonTextDestructive,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  accentBar: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    fontFamily: fonts.BOLD,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonRowSingle: {
    justifyContent: 'flex-end',
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  buttonSingle: {
    flexGrow: 0,
    minWidth: 110,
  },
  buttonCancel: {
    backgroundColor: colors.primarySoft,
  },
  buttonDestructive: {
    backgroundColor: '#FFE7E8',
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  buttonTextCancel: {
    color: colors.primary,
  },
  buttonTextDestructive: {
    color: '#D94152',
  },
});
