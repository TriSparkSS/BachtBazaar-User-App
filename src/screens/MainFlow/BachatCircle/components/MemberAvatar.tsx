import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../../helpers/styles';
import { circleColors } from '../theme';

type Props = {
  name: string;
  initial: string;
  color: string;
  size?: number;
  online?: boolean;
  ring?: boolean;
  ringColor?: string;
};

const MemberAvatar = ({
  name,
  initial,
  color,
  size = 44,
  online,
  ring = true,
  ringColor = circleColors.white,
}: Props) => {
  const ringWidth = ring ? Math.max(2, Math.round(size * 0.05)) : 0;
  const inner = size - ringWidth * 2;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.outer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: ringColor,
            backgroundColor: ringColor,
          },
        ]}
      >
        <View
          style={[
            styles.avatar,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              backgroundColor: color,
            },
          ]}
        >
          <Text
            style={[
              styles.initial,
              { fontSize: Math.max(12, size * 0.36) },
            ]}
          >
            {initial || name.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      {online ? (
        <View
          style={[
            styles.onlineDot,
            {
              width: Math.max(10, size * 0.24),
              height: Math.max(10, size * 0.24),
              borderRadius: Math.max(5, size * 0.12),
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: circleColors.green,
    fontFamily: fonts.BOLD,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: circleColors.online,
    borderWidth: 2,
    borderColor: circleColors.white,
  },
});

export default MemberAvatar;
