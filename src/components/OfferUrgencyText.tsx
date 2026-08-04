import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { OfferDetail } from '../types/shop';
import { buildOfferUrgencyText, formatOfferCountdown, formatOfferExpiryDate } from '../utils/offer';

type OfferUrgencyTextProps = {
  offer: OfferDetail;
  style?: StyleProp<TextStyle>;
};

const buildStaticUrgency = (offer: OfferDetail): string => {
  if (offer.timeline?.isExpired) {
    return 'This offer has expired.';
  }

  if (offer.timeline?.isUpcoming) {
    const days = offer.timeline.remainingDays;
    if (days != null && days > 0) {
      return `Starts in ${days === 1 ? '1 day' : `${days} days`}.`;
    }

    return `Starts on ${formatOfferExpiryDate(offer.timeline.startDate)}.`;
  }

  return buildOfferUrgencyText(offer);
};

const OfferUrgencyText: React.FC<OfferUrgencyTextProps> = ({ offer, style }) => {
  const [text, setText] = useState(() => buildStaticUrgency(offer));

  useEffect(() => {
    if (offer.timeline?.isExpired || offer.timeline?.isUpcoming) {
      setText(buildStaticUrgency(offer));
      return;
    }

    const expiresAt = offer.expiresAt ?? offer.timeline?.endDate;
    if (!expiresAt) {
      setText(buildStaticUrgency(offer));
      return;
    }

    const tick = () => {
      const countdown = formatOfferCountdown({ expiresAt });
      if (countdown === 'Expired') {
        setText('This offer has expired.');
        return;
      }

      if (offer.timeline?.remainingDays != null) {
        setText(`Hurry! This offer ends in ${countdown}.`);
        return;
      }

      setText(`Hurry! This offer expires in ${countdown}.`);
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [offer]);

  return <Text style={style}>{text}</Text>;
};

export default OfferUrgencyText;
