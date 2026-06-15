import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors } from '../helpers/styles';

export const keyboardAwareScrollProps = {
  keyboardShouldPersistTaps: 'always' as const,
  keyboardDismissMode: 'on-drag' as const,
};

export type AppTextInputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  focusedContainerStyle?: StyleProp<ViewStyle>;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
};

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  (
    {
      containerStyle,
      focusedContainerStyle,
      leftAdornment,
      rightAdornment,
      style,
      editable = true,
      onFocus,
      onBlur,
      placeholderTextColor = '#99A4B8',
      selectionColor = colors.primary,
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<TextInput>(null);
    const [focused, setFocused] = useState(false);

    useImperativeHandle(ref, () => inputRef.current as TextInput);

    return (
      <Pressable
        style={[
          styles.container,
          containerStyle,
          focused && styles.focused,
          focused && focusedContainerStyle,
        ]}
        onPress={() => {
          if (editable) {
            inputRef.current?.focus();
          }
        }}
        disabled={!editable}>
        {leftAdornment}
        <TextInput
          ref={inputRef}
          style={[styles.input, style]}
          editable={editable}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={placeholderTextColor}
          selectionColor={selectionColor}
          autoCorrect={false}
          spellCheck={false}
          underlineColorAndroid="transparent"
          showSoftInputOnFocus
          {...props}
        />
        {rightAdornment}
      </Pressable>
    );
  },
);

AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#182238',
    paddingVertical: Platform.OS === 'android' ? 8 : 0,
    minHeight: 40,
  },
});
