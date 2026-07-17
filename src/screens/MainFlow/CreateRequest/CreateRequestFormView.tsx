import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../../../helpers/styles';
import { Category } from '../../../types/category';
import { CreateRequestFormParams, RequestUrgency } from '../../../types/createRequest';
import { estimateAveragePriceRange } from '../../../utils/createRequestMocks';
import { showAppAlert } from '../../../services/appAlert';
import {
  getCurrentDeviceCoordinates,
  requestLocationPermission,
} from '../../../utils/deviceLocation';
import { reverseGeocodeWithGoogle } from '../../../utils/googleGeocoding';

type CreateRequestFormViewProps = {
  initialLocation: string;
  categories: Category[];
  isLoadingCategories?: boolean;
  isSubmitting?: boolean;
  resolveCategoryImageUrl: (path?: string | null) => string | undefined;
  onBack: () => void;
  onSubmit: (payload: CreateRequestFormParams) => void | Promise<void>;
};

const PRIMARY = colors.primary;
const MIC = '#E67E22';
const CAM = '#22A45A';
const PIN = '#22A45A';
const FLASH = '#F5A623';

const URGENCY: { id: RequestUrgency; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'flash' },
  { id: 'soon', label: 'Within 2 Days', icon: 'calendar-month-outline' },
  { id: 'flexible', label: 'Flexible', icon: 'clock-outline' },
];

const categoryFallbackIcon = (label: string): string => {
  const name = label.toLowerCase();
  if (name.includes('auto') || name.includes('car') || name.includes('vehicle')) {
    return 'car-outline';
  }
  if (name.includes('fashion') || name.includes('cloth') || name.includes('apparel')) {
    return 'tshirt-crew-outline';
  }
  if (name.includes('daily') || name.includes('grocery') || name.includes('need')) {
    return 'basket-outline';
  }
  if (name.includes('deliver')) {
    return 'truck-delivery-outline';
  }
  if (name.includes('food')) {
    return 'food-outline';
  }
  if (name.includes('jewel')) {
    return 'diamond-stone';
  }
  if (name.includes('home') || name.includes('kitchen')) {
    return 'sofa-outline';
  }
  if (name.includes('electron')) {
    return 'laptop';
  }
  return 'shape-outline';
};

const CreateRequestFormView: React.FC<CreateRequestFormViewProps> = ({
  initialLocation,
  categories,
  isLoadingCategories = false,
  isSubmitting = false,
  resolveCategoryImageUrl,
  onBack,
  onSubmit,
}) => {
  const [product, setProduct] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState<RequestUrgency>('flexible');
  const [location, setLocation] = useState(initialLocation);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find(item => item.id === categoryId) ?? categories[0],
    [categories, categoryId],
  );

  const effectiveCategoryId = categoryId || categories[0]?.id || '';
  const priceHint = useMemo(() => estimateAveragePriceRange(product), [product]);
  const canSubmit = product.trim().length >= 2;

  const handleEditLocation = async () => {
    try {
      setIsDetectingLocation(true);
      const granted = await requestLocationPermission();
      if (!granted) {
        showAppAlert('Location permission', 'Please allow location access to update location.');
        return;
      }
      const coords = await getCurrentDeviceCoordinates();
      if (!coords) {
        showAppAlert('Location unavailable', 'Could not fetch your current location.');
        return;
      }
      const geocoded = await reverseGeocodeWithGoogle(coords.latitude, coords.longitude);
      const nextAddress =
        geocoded.address?.trim() ||
        [geocoded.city].filter(Boolean).join(', ') ||
        `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      setLocation(nextAddress);
    } catch {
      showAppAlert('Location failed', 'Unable to update your location right now.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    if (!effectiveCategoryId) {
      showAppAlert('Category required', 'Please select a category to continue.');
      return;
    }

    onSubmit({
      product: product.trim(),
      category: selectedCategory?.label || selectedCategory?.value || 'General',
      categoryId: effectiveCategoryId,
      budget: budget.trim() || undefined,
      urgency,
      location: location.trim() || initialLocation,
    });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Best Deal</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>What do you want to buy?</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="e.g., iPhone 15 Pro, Samsung TV..."
                placeholderTextColor="#B0B7C3"
                value={product}
                onChangeText={setProduct}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                style={styles.trailIcon}
                activeOpacity={0.75}
                onPress={() =>
                  showAppAlert('Voice', 'Voice input will be available soon.', [{ text: 'OK' }])
                }>
                <MaterialCommunityIcons name="microphone" size={17} color={MIC} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trailIcon}
                activeOpacity={0.75}
                onPress={() =>
                  showAppAlert('Camera', 'Product photo scan will be available soon.', [
                    { text: 'OK' },
                  ])
                }>
                <MaterialCommunityIcons name="camera" size={17} color={CAM} />
              </TouchableOpacity>
            </View>

            {priceHint ? (
              <View style={styles.aiCard}>
                <MaterialCommunityIcons name="robot-happy-outline" size={18} color="#1B7A3D" />
                <Text style={styles.aiText}>
                  AI Insight: Average price for {product.trim()} nearby is ₹
                  {priceHint.min.toLocaleString('en-IN')}
                  {priceHint.max !== priceHint.min
                    ? ` – ₹${priceHint.max.toLocaleString('en-IN')}`
                    : ''}
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Category</Text>
            {isLoadingCategories ? (
              <View style={styles.catLoading}>
                <ActivityIndicator size="small" color={PRIMARY} />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}>
                {categories.map(item => {
                  const selected = effectiveCategoryId === item.id;
                  const label = item.label || item.value;
                  const imageUri = resolveCategoryImageUrl(item.image);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.85}
                      onPress={() => setCategoryId(item.id)}
                      style={[styles.catCard, selected && styles.catCardSelected]}>
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.catImage} />
                      ) : (
                        <MaterialCommunityIcons
                          name={categoryFallbackIcon(label)}
                          size={18}
                          color={selected ? PRIMARY : '#6B7280'}
                        />
                      )}
                      <Text
                        numberOfLines={2}
                        style={[styles.catLabel, selected && styles.catLabelSelected]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.label}>Your Budget (Optional)</Text>
            <View style={styles.inputBox}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={[styles.input, styles.budgetInput]}
                placeholder="Enter your budget"
                placeholderTextColor="#B0B7C3"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                underlineColorAndroid="transparent"
              />
            </View>

            <Text style={styles.label}>When do you need it?</Text>
            <View style={styles.urgencyRow}>
              {URGENCY.map(item => {
                const selected = urgency === item.id;
                const iconColor = selected
                  ? colors.white
                  : item.id === 'today'
                    ? FLASH
                    : item.id === 'soon'
                      ? PRIMARY
                      : '#8B95A7';
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.88}
                    onPress={() => setUrgency(item.id)}
                    style={[styles.urgencyCard, selected && styles.urgencyCardOn]}>
                    <MaterialCommunityIcons name={item.icon} size={18} color={iconColor} />
                    <Text
                      numberOfLines={2}
                      style={[styles.urgencyText, selected && styles.urgencyTextOn]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Delivery Location</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={18} color={PIN} />
              <Text style={styles.locationText} numberOfLines={2}>
                {location || 'Add delivery address'}
              </Text>
              <TouchableOpacity
                onPress={handleEditLocation}
                disabled={isDetectingLocation}
                hitSlop={10}
                activeOpacity={0.7}>
                <Text style={styles.editText}>
                  {isDetectingLocation ? '...' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <TouchableOpacity
              style={[styles.cta, (!canSubmit || isSubmitting) && styles.ctaOff]}
              disabled={!canSubmit || isSubmitting}
              activeOpacity={0.9}
              onPress={handleSubmit}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.ctaText}>Get Best Offers</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.hint}>
              We&apos;ll notify nearby shops and get you the best deals
            </Text>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default CreateRequestFormView;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PRIMARY,
  },
  flex: {
    flex: 1,
  },
  headerSafe: {
    backgroundColor: PRIMARY,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: colors.white,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.1,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8A93A6',
    fontFamily: fonts.BOLD,
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E8F0',
    backgroundColor: '#FBFCFD',
    paddingLeft: 12,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.BOLD,
    paddingVertical: 10,
  },
  budgetInput: {
    paddingLeft: 2,
  },
  trailIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupee: {
    fontSize: 13,
    color: '#9AA3B2',
    fontFamily: fonts.BOLD,
    marginRight: 2,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EAF8EF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  aiText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: '#1B5E20',
    fontFamily: fonts.BOLD,
  },
  catLoading: {
    height: 64,
    justifyContent: 'center',
    marginBottom: 16,
  },
  catRow: {
    gap: 8,
    paddingBottom: 2,
    marginBottom: 16,
  },
  catCard: {
    width: 86,
    minHeight: 68,
    borderRadius: 12,
    backgroundColor: '#F3F5F9',
    borderWidth: 1.2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 6,
  },
  catCardSelected: {
    backgroundColor: '#EEF4FF',
    borderColor: PRIMARY,
  },
  catImage: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  catLabel: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: '#5B6475',
    fontFamily: fonts.BOLD,
  },
  catLabelSelected: {
    color: PRIMARY,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  urgencyCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.2,
    borderColor: '#E4E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 6,
  },
  urgencyCardOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  urgencyText: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: '#4B5565',
    fontFamily: fonts.BOLD,
  },
  urgencyTextOn: {
    color: colors.white,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  editText: {
    fontSize: 12,
    color: PRIMARY,
    fontFamily: fonts.BOLD,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: colors.white,
  },
  cta: {
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaOff: {
    backgroundColor: '#9BB6F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 14,
    color: colors.white,
    fontFamily: fonts.BOLD,
    letterSpacing: 0.2,
  },
  hint: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: '#9AA3B2',
    fontFamily: fonts.BOLD,
  },
});
