import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePendingDeliveryRequest } from '../../../context/PendingDeliveryRequestContext';
import { colors, fonts } from '../../../helpers/styles';
import { openChatWithNumber, openPhoneDialer } from '../../../helpers/contactActions';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import { shopApi } from '../../../services/shopApi';
import { formatShopAddress } from '../../../utils/shop';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const RequestDeliveryAccepted = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'RequestDeliveryAccepted'>>();
  const route = useRoute();
  const params = route.params as MainStackParamList['RequestDeliveryAccepted'];
  const { shop, product, requestId, orderId, deliveryFee, eta } = params;
  const { refreshPendingFromApi } = usePendingDeliveryRequest();

  useEffect(() => {
    void refreshPendingFromApi();
  }, [refreshPendingFromApi]);

  const logoUri = shopApi.resolveImageUrl(shop.logo) ?? SHOP_LOGO_PLACEHOLDER;
  const address = formatShopAddress(shop);

  const handleCall = async () => {
    try {
      await openPhoneDialer(shop.phone);
    } catch (error) {
      showAppAlert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Phone number is not available.',
      );
    }
  };

  const handleChat = async () => {
    try {
      await openChatWithNumber(
        shop.phone,
        `Hi, I'm following up on my Bachat Bazaar delivery request for "${product.title}" (${orderId}).`,
      );
    } catch (error) {
      showAppAlert(
        'Chat unavailable',
        error instanceof Error ? error.message : 'Mobile number is not available for chat.',
      );
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.acceptedBanner}>
        <MaterialCommunityIcons name="check-circle" size={22} color={colors.white} />
        <Text style={styles.acceptedText}>Accepted</Text>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.merchantCard}>
          <Image source={{ uri: logoUri }} style={styles.logo} />
          <View style={styles.merchantBody}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.metaRow}>
              {shop.distance ? (
                <Text style={styles.metaText}>{shop.distance}</Text>
              ) : address ? (
                <Text style={styles.metaText} numberOfLines={1}>
                  {address}
                </Text>
              ) : null}
              {shop.rating ? (
                <View style={styles.ratingPill}>
                  <MaterialCommunityIcons name="star" size={12} color="#F5A623" />
                  <Text style={styles.ratingText}>{shop.rating}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Delivery Time</Text>
            <Text style={styles.detailValue}>{eta || '30-40 mins'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Charge</Text>
            <Text style={styles.detailValue}>₹{deliveryFee.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order ID</Text>
            <Text style={styles.detailValue}>{orderId}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.88} onPress={handleCall}>
            <MaterialCommunityIcons name="phone-outline" size={18} color={colors.primary} />
            <Text style={styles.outlineText}>Call Merchant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.88} onPress={handleChat}>
            <MaterialCommunityIcons name="chat-outline" size={18} color={colors.primary} />
            <Text style={styles.outlineText}>Chat with Merchant</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate('CreateRequestOffers', {
              requestId,
              title: product.title,
              status: 'active',
              budget: deliveryFee,
              timeframe: 'today',
            })
          }>
          <Text style={styles.ctaText}>View Order Status</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

export default RequestDeliveryAccepted;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  acceptedBanner: {
    backgroundColor: '#22A45A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 14,
    paddingTop: 8,
  },
  acceptedText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  merchantCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    marginBottom: 16,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF4FF',
  },
  merchantBody: {
    flex: 1,
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7E8',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#8A5A00',
    fontFamily: fonts.BOLD,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
    gap: 14,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  outlineText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF3',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
});
