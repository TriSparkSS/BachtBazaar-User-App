import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { formatOfferCountdown } from '../utils/offer';

type OfferCountdownTextProps = {
  expiresAt?: string;
  countdown?: string;
  prefix?: string;
  suffix?: string;
  expiredText?: string;
  style?: StyleProp<TextStyle>;
};

const OfferCountdownText: React.FC<OfferCountdownTextProps> = ({
  expiresAt,
  countdown,
  prefix = '',
  suffix = '',
  expiredText = 'Expired',
  style,
}) => {
  const buildText = () => {
    if (countdown?.trim()) {
      return countdown.trim();
    }

    if (!expiresAt) {
      return `${prefix}${formatOfferCountdown({})}${suffix}`;
    }

    const value = formatOfferCountdown({ expiresAt });
    if (value === 'Expired') {
      return expiredText;
    }

    return `${prefix}${value}${suffix}`;
  };

  const [text, setText] = useState(buildText);

  useEffect(() => {
    if (countdown?.trim()) {
      setText(countdown.trim());
      return;
    }

    if (!expiresAt) {
      setText(`${prefix}${formatOfferCountdown({})}${suffix}`);
      return;
    }

    const tick = () => {
      const value = formatOfferCountdown({ expiresAt });
      setText(value === 'Expired' ? expiredText : `${prefix}${value}${suffix}`);
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [countdown, expiresAt, expiredText, prefix, suffix]);

  return <Text style={style}>{text}</Text>;
};

export default OfferCountdownText;
