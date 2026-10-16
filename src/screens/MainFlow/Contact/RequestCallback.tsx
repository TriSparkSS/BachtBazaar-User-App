import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  PREFERRED_CALL_TIMES,
  callbackApi,
} from '../../../services/callbackApi';

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const RequestCallback = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'RequestCallback'>>();
  const { authToken, currentUser } = useAppContext();

  const [contactName, setContactName] = useState(currentUser?.name?.trim() ?? '');
  const [contactPhone, setContactPhone] = useState(
    currentUser?.phone?.replace(/\D/g, '').slice(-10) ?? '',
  );
  const [contactEmail, setContactEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [preferredCallTime, setPreferredCallTime] = useState<string>(
    PREFERRED_CALL_TIMES[2],
  );
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneDigits = useMemo(
    () => contactPhone.replace(/\D/g, '').slice(-10),
    [contactPhone],
  );

  const submit = async () => {
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in to request a support call.');
      return;
    }

    const name = contactName.trim();
    const email = contactEmail.trim();
    const topicText = topic.trim();
    const messageText = message.trim();

    if (!name) {
      showAppAlert('Name required', 'Please enter the name we should ask for.');
      return;
    }
    if (phoneDigits.length !== 10) {
      showAppAlert('Phone required', 'Please enter a 10-digit mobile number.');
      return;
    }
    if (!isValidEmail(email)) {
      showAppAlert('Email required', 'Please enter a valid email address.');
      return;
    }
    if (!topicText) {
      showAppAlert('Topic required', 'Please tell us what this call is about.');
      return;
    }
    if (!messageText) {
      showAppAlert(
        'Message required',
        'Please describe the issue so our team can prepare.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await callbackApi.requestCall(token, {
        contactName: name,
        contactPhone: phoneDigits,
        contactEmail: email,
        topic: topicText,
        message: messageText,
        preferredCallTime,
      });
      showAppAlert(
        'Call requested',
        'Our support team will call you in the selected time slot.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      showAppAlert(
        'Could not request call',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request a call</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Share your details and preferred time. Support will call you back.
          </Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Your full name"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.mutedText}
            keyboardType="phone-pad"
            maxLength={14}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedText}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Topic</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="What do you need help with?"
            placeholderTextColor={colors.mutedText}
            maxLength={140}
          />

          <Text style={styles.label}>Preferred call time</Text>
          <TouchableOpacity
            style={styles.select}
            onPress={() => setTimePickerOpen(true)}
            activeOpacity={0.85}>
            <Text style={styles.selectText}>{preferredCallTime}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.mutedText}
            />
          </TouchableOpacity>

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what happened so we can prepare for the call"
            placeholderTextColor={colors.mutedText}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
            onPress={() => void submit()}
            disabled={isSubmitting}
            activeOpacity={0.85}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Request call</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={timePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerOpen(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setTimePickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select a time slot</Text>
            {PREFERRED_CALL_TIMES.map(option => {
              const selected = option === preferredCallTime;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionRow, selected && styles.optionSelected]}
                  onPress={() => {
                    setPreferredCallTime(option);
                    setTimePickerOpen(false);
                  }}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}>
                    {option}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={colors.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default RequestCallback;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  intro: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 140,
    paddingTop: 12,
  },
  select: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.BOLD,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  optionTextSelected: {
    color: colors.primary,
  },
});
