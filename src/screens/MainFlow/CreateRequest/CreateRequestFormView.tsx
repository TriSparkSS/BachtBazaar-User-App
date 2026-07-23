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
  showHeader?: boolean;
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
  if (name.includes('mobile') || name.includes('phone')) {
    return 'cellphone';
  }
  if (name.includes('tv') || name.includes('electron')) {
    return 'television';
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
  if (name.includes('home') || name.includes('kitchen') || name.includes('fridge')) {
    return 'fridge-outline';
  }
  if (name.includes('ac') || name.includes('air')) {
    return 'air-conditioner';
  }
  return 'shape-outline';
};

const CreateRequestFormView: React.FC<CreateRequestFormViewProps> = ({
  initialLocation,
  categories,
  isLoadingCategories = false,
  isSubmitting = false,
  showHeader = true,
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

  const urgencyIconColor = (id: RequestUrgency, selected: boolean) => {
    if (selected) {
      return colors.white;
    }
    if (id === 'today') {
      return FLASH;
    }
    if (id === 'soon') {
      return PRIMARY;
    }
    return '#8B95A7';
  };

  return (
    <View style={[styles.root, !showHeader && styles.rootEmbedded]}>
      {showHeader ? (
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.85}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request Best Deal</Text>
            <View style={styles.backBtn} />
          </View>
        </SafeAreaView>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, !showHeader && styles.sheetEmbedded]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>What do you want to buy?</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="e.g., iPhone 15 Pro, Samsung S23"
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
                <MaterialCommunityIcons name="microphone" size={18} color={MIC} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trailIcon}
                activeOpacity={0.75}
                onPress={() =>
                  showAppAlert('Camera', 'Product photo scan will be available soon.', [
                    { text: 'OK' },
                  ])
                }>
                <MaterialCommunityIcons name="camera" size={18} color={CAM} />
              </TouchableOpacity>
            </View>

            {priceHint ? (
              <View style={styles.aiCard}>
                <MaterialCommunityIcons name="lightbulb-on" size={16} color="#1B7A3D" />
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
                      <View style={[styles.catIcon, selected && styles.catIconSelected]}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.catImage} />
                        ) : (
                          <MaterialCommunityIcons
                            name={categoryFallbackIcon(label)}
                            size={18}
                            color={selected ? PRIMARY : '#5B6475'}
                          />
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
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
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.88}
                    onPress={() => setUrgency(item.id)}
                    style={[styles.urgencyCard, selected && styles.urgencyCardOn]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={urgencyIconColor(item.id, selected)}
                    />
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
            <View style={styles.locationBox}>
              <MaterialCommunityIcons name="map-marker" size={18} color={PIN} />
              <Text style={styles.locationText} numberOfLines={2}>
                {location || 'Add delivery address'}
              </Text>
              <TouchableOpacity
                onPress={handleEditLocation}
                disabled={isDetectingLocation}
                hitSlop={10}
                activeOpacity={0.7}>
                <Text style={styles.detectText}>
                  {isDetectingLocation ? 'Detecting...' : 'Detect'}
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
  rootEmbedded: {
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  headerSafe: {
    backgroundColor: PRIMARY,
  },
  header: {
    height: 54,
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
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetEmbedded: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#7A8499',
    fontFamily: fonts.BOLD,
    marginBottom: 10,
  },
  inputBox: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    backgroundColor: '#FAFBFD',
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    paddingVertical: 12,
  },
  budgetInput: {
    paddingLeft: 4,
  },
  trailIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupee: {
    fontSize: 15,
    color: '#9AA3B2',
    fontFamily: fonts.BOLD,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EAF8EF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -8,
    marginBottom: 18,
  },
  aiText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#1B5E20',
    fontFamily: fonts.BOLD,
  },
  catLoading: {
    height: 72,
    justifyContent: 'center',
    marginBottom: 18,
  },
  catRow: {
    gap: 10,
    paddingBottom: 2,
    marginBottom: 18,
  },
  catCard: {
    width: 78,
    alignItems: 'center',
    gap: 8,
  },
  catCardSelected: {},
  catIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catIconSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: PRIMARY,
  },
  catImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  catLabel: {
    fontSize: 11,
    color: '#5B6475',
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  catLabelSelected: {
    color: PRIMARY,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  urgencyCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E5E9F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 8,
  },
  urgencyCardOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  urgencyText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: '#4B5565',
    fontFamily: fonts.BOLD,
  },
  urgencyTextOn: {
    color: colors.white,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    backgroundColor: '#FAFBFD',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  detectText: {
    fontSize: 12,
    color: PRIMARY,
    fontFamily: fonts.BOLD,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
    backgroundColor: colors.white,
  },
  cta: {
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  ctaOff: {
    backgroundColor: '#9BB6F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: fonts.BOLD,
  },
  hint: {
    marginTop: 10,
    fontSize: 11,
    textAlign: 'center',
    color: '#9AA3B2',
    fontFamily: fonts.BOLD,
  },
});
