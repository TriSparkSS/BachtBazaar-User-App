import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { showAppAlert } from '../services/appAlert';

type UseSpeechToTextOptions = {
  locale?: string;
  onResult?: (transcript: string) => void;
};

type SpeechErrorEvent = {
  error?: {
    code?: string;
    message?: string;
  };
};

type SpeechResultsEvent = {
  value?: string[];
};

type SpeechToTextNative = {
  isAvailable: () => Promise<boolean>;
  start: (locale?: string) => Promise<boolean>;
  stop: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
  destroy: () => Promise<boolean>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

const { SpeechToText } = NativeModules as {
  SpeechToText?: SpeechToTextNative;
};

const requestMicPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const already = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (already) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone permission',
      message: 'Allow microphone access to search by voice.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const useSpeechToText = ({
  locale = 'en-IN',
  onResult,
}: UseSpeechToTextOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const onResultRef = useRef(onResult);
  const startingRef = useRef(false);
  const activeSessionRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stopListening = useCallback(async () => {
    try {
      await SpeechToText?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
    startingRef.current = false;
    activeSessionRef.current = false;
  }, []);

  const cancelListening = useCallback(async () => {
    try {
      await SpeechToText?.cancel();
    } catch {
      // ignore
    }
    setIsListening(false);
    setPartialTranscript('');
    startingRef.current = false;
    activeSessionRef.current = false;
  }, []);

  useEffect(() => {
    if (!SpeechToText) {
      return;
    }

    const emitter = new NativeEventEmitter(SpeechToText as never);

    const startSub = emitter.addListener('onSpeechStart', () => {
      if (!activeSessionRef.current) {
        return;
      }
      setIsListening(true);
      startingRef.current = false;
    });

    const endSub = emitter.addListener('onSpeechEnd', () => {
      setIsListening(false);
      startingRef.current = false;
      activeSessionRef.current = false;
    });

    const errorSub = emitter.addListener('onSpeechError', (event: SpeechErrorEvent) => {
      setIsListening(false);
      startingRef.current = false;
      activeSessionRef.current = false;

      const code = String(event?.error?.code ?? '');
      const message = String(event?.error?.message ?? '');

      // Cancel / silence / no match — don't alert
      if (
        code === '5' ||
        code === '6' ||
        code === '7' ||
        /canceled|cancelled|no match|no speech|timeout/i.test(`${code} ${message}`)
      ) {
        return;
      }

      showAppAlert(
        'Voice search',
        message || 'Could not recognize speech. Please try again.',
        [{ text: 'OK' }],
      );
    });

    const partialSub = emitter.addListener(
      'onSpeechPartialResults',
      (event: SpeechResultsEvent) => {
        if (!activeSessionRef.current) {
          return;
        }
        const next = event?.value?.[0]?.trim() ?? '';
        if (next) {
          setPartialTranscript(next);
        }
      },
    );

    const resultsSub = emitter.addListener('onSpeechResults', (event: SpeechResultsEvent) => {
      const transcript = event?.value?.[0]?.trim() ?? '';
      setIsListening(false);
      startingRef.current = false;
      activeSessionRef.current = false;
      if (transcript) {
        setPartialTranscript(transcript);
        onResultRef.current?.(transcript);
      }
    });

    return () => {
      startSub.remove();
      endSub.remove();
      errorSub.remove();
      partialSub.remove();
      resultsSub.remove();
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!SpeechToText) {
      showAppAlert(
        'Voice search',
        'Voice search is not available in this build.',
        [{ text: 'OK' }],
      );
      return;
    }

    // System dialog is already open
    if (startingRef.current || isListening) {
      return;
    }

    const allowed = await requestMicPermission();
    if (!allowed) {
      showAppAlert(
        'Microphone permission',
        'Enable microphone permission in Settings to use voice search.',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      startingRef.current = true;
      activeSessionRef.current = true;
      setPartialTranscript('');
      setIsListening(true);

      const available = await SpeechToText.isAvailable();
      if (!available) {
        startingRef.current = false;
        activeSessionRef.current = false;
        setIsListening(false);
        showAppAlert(
          'Voice search',
          'Speech recognition is not available on this device. Install Google speech services.',
          [{ text: 'OK' }],
        );
        return;
      }

      // Opens the Android “Speak now” system dialog
      await SpeechToText.start(locale);
    } catch (error) {
      startingRef.current = false;
      activeSessionRef.current = false;
      setIsListening(false);
      showAppAlert(
        'Voice search',
        error instanceof Error ? error.message : 'Unable to start voice search.',
        [{ text: 'OK' }],
      );
    }
  }, [isListening, locale]);

  const toggleListening = useCallback(async () => {
    if (isListening || startingRef.current) {
      // Dialog is open — ignore second tap; user closes dialog themselves
      return;
    }
    await startListening();
  }, [isListening, startListening]);

  return {
    isListening,
    partialTranscript,
    startListening,
    stopListening,
    cancelListening,
    toggleListening,
  };
};
