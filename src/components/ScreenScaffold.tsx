import React, { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keyboardAwareScrollProps } from './AppTextInput';
import { colors } from '../helpers/styles';

export const SCREEN_TOP_GAP = 10;
export const SCREEN_HEADER_BOTTOM_GAP = 14;

export const BackChevronIcon = () => (
  <View style={styles.backChevron}>
    <View style={[styles.backChevronLine, styles.backChevronTop]} />
    <View style={[styles.backChevronLine, styles.backChevronBottom]} />
  </View>
);

type ScreenScaffoldProps = PropsWithChildren<{
  onBack?: () => void;
  background?: ReactNode;
  backgroundColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  centerContent?: boolean;
  overlay?: ReactNode;
}>;

export const ScreenScaffold = ({
  children,
  onBack,
  background,
  backgroundColor = '#F7FAFF',
  contentContainerStyle,
  centerContent = true,
  overlay,
}: ScreenScaffoldProps) => (
  <View style={[styles.root, { backgroundColor }]}>
    {background ? (
      <View style={styles.backgroundLayer} pointerEvents="none">
        {background}
      </View>
    ) : null}

    <SafeAreaView edges={['top']} style={styles.topBar}>
      {onBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <BackChevronIcon />
        </TouchableOpacity>
      ) : (
        <View style={styles.topSpacer} />
      )}
    </SafeAreaView>

    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          centerContent && styles.scrollContentCentered,
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        {...keyboardAwareScrollProps}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>

    {overlay}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: SCREEN_TOP_GAP,
    paddingBottom: SCREEN_HEADER_BOTTOM_GAP,
    zIndex: 20,
  },
  topSpacer: {
    height: SCREEN_TOP_GAP,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#173E7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 7,
  },
  backChevron: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevronLine: {
    position: 'absolute',
    width: 18,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  backChevronTop: {
    transform: [{ rotate: '-45deg' }],
    top: 3,
  },
  backChevronBottom: {
    transform: [{ rotate: '45deg' }],
    bottom: 3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 4,
  },
  scrollContentCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
