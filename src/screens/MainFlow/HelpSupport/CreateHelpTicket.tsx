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
  HELP_TICKET_CATEGORIES,
  HELP_TICKET_PRIORITIES,
  HelpTicketPriority,
  helpApi,
} from '../../../services/helpApi';

type PickerKind = 'category' | 'priority' | null;

const CreateHelpTicket = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'CreateHelpTicket'>>();
  const { authToken } = useAppContext();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string>(HELP_TICKET_CATEGORIES[0]);
  const [priority, setPriority] = useState<HelpTicketPriority>('Medium');
  const [description, setDescription] = useState('');
  const [picker, setPicker] = useState<PickerKind>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickerOptions = useMemo(() => {
    if (picker === 'category') {
      return [...HELP_TICKET_CATEGORIES];
    }
    if (picker === 'priority') {
      return [...HELP_TICKET_PRIORITIES];
    }
    return [];
  }, [picker]);

  const submit = async () => {
    const token = authToken?.trim();
    if (!token) {
      showAppAlert('Login required', 'Please log in to create a support ticket.');
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (!trimmedSubject) {
      showAppAlert('Subject required', 'Please enter a subject for your ticket.');
      return;
    }
    if (!trimmedDescription) {
      showAppAlert(
        'Description required',
        'Please describe your issue so we can help.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await helpApi.createTicket(
        {
          subject: trimmedSubject,
          category,
          priority,
          description: trimmedDescription,
        },
        token,
      );

      navigation.replace('HelpTicketDetail', { ticketId: result.ticketId });
    } catch (error) {
      showAppAlert(
        'Could not create ticket',
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
          <Text style={styles.headerTitle}>New ticket</Text>
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
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary of your issue"
            placeholderTextColor={colors.mutedText}
            maxLength={120}
          />

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.select}
            onPress={() => setPicker('category')}
            activeOpacity={0.85}>
            <Text style={styles.selectText}>{category}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.mutedText}
            />
          </TouchableOpacity>

          <Text style={styles.label}>Priority</Text>
          <TouchableOpacity
            style={styles.select}
            onPress={() => setPicker('priority')}
            activeOpacity={0.85}>
            <Text style={styles.selectText}>{priority}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.mutedText}
            />
          </TouchableOpacity>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us what happened and how we can help"
            placeholderTextColor={colors.mutedText}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitDisabled]}
            onPress={submit}
            disabled={isSubmitting}
            activeOpacity={0.85}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Submit ticket</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={picker != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {picker === 'category' ? 'Select category' : 'Select priority'}
            </Text>
            {pickerOptions.map(option => {
              const selected =
                picker === 'category' ? option === category : option === priority;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionRow, selected && styles.optionSelected]}
                  onPress={() => {
                    if (picker === 'category') {
                      setCategory(option);
                    } else if (picker === 'priority') {
                      setPriority(option as HelpTicketPriority);
                    }
                    setPicker(null);
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

export default CreateHelpTicket;

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
