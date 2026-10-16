import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../../../context/AppContext';
import { colors, fonts } from '../../../helpers/styles';
import { MainStackParamList } from '../../../navigation/types';
import { showAppAlert } from '../../../services/appAlert';
import {
  areaRadiusStorage,
  clampAreaRadiusKm,
  DEFAULT_AREA_RADIUS_KM,
  MAX_AREA_RADIUS_KM,
  MIN_AREA_RADIUS_KM,
} from '../../../services/areaRadiusStorage';
import { radiusApi } from '../../../services/radiusApi';

const STEP_SMALL = 1;
const STEP_LARGE = 10;

const ChangeAreaRadiusScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'ChangeAreaRadius'>>();
  const { authToken } = useAppContext();
  const [radiusKm, setRadiusKm] = useState(DEFAULT_AREA_RADIUS_KM);
  const [locationLabel, setLocationLabel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        setIsLoading(true);
        try {
          const token = authToken?.trim();
          if (token) {
            const remote = await radiusApi.getRadius(token);
            if (!active) {
              return;
            }
            setRadiusKm(remote.radiusKm);
            setLocationLabel(remote.location?.city?.trim() ?? '');
            return;
          }

          const stored = await areaRadiusStorage.getRadiusKm();
          if (active) {
            setRadiusKm(stored);
            setLocationLabel('');
          }
        } catch {
          const stored = await areaRadiusStorage.getRadiusKm();
          if (active) {
            setRadiusKm(stored);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

      void load();

      return () => {
        active = false;
      };
    }, [authToken]),
  );

  const applyDelta = useCallback((delta: number) => {
    setRadiusKm(current => clampAreaRadiusKm(current + delta));
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const token = authToken?.trim();
      const saved = token
        ? (await radiusApi.updateRadius(token, radiusKm)).radiusKm
        : await areaRadiusStorage.setRadiusKm(radiusKm);
      setRadiusKm(saved);
      showAppAlert(
        'Radius updated',
        `Your feed will now show shops and offers within ${saved} km.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      showAppAlert('Error', 'Could not save area radius. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSaving(false);
    }
  }, [authToken, isSaving, navigation, radiusKm]);

  const progress = useMemo(() => {
    const span = MAX_AREA_RADIUS_KM - MIN_AREA_RADIUS_KM;
    return Math.max(0, Math.min(1, (radiusKm - MIN_AREA_RADIUS_KM) / span));
  }, [radiusKm]);

  const helperText = useMemo(
    () =>
      `Default ${DEFAULT_AREA_RADIUS_KM} km · Min ${MIN_AREA_RADIUS_KM} km · Max ${MAX_AREA_RADIUS_KM} km`,
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={10}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={colors.text}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Change Radius</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons
                name="map-marker-radius-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.heroLabel}>Search radius</Text>
            <Text style={styles.heroValue}>{radiusKm} km</Text>
            <Text style={styles.heroHint}>
              {locationLabel
                ? `Shops and offers near ${locationLabel} load inside this distance.`
                : 'Shops and offers in your feed load inside this distance from your location.'}
            </Text>
          </View>

          <View style={styles.controlsCard}>
            <View style={styles.stepRow}>
              <Pressable
                onPress={() => applyDelta(-STEP_LARGE)}
                style={[
                  styles.stepButton,
                  radiusKm <= MIN_AREA_RADIUS_KM && styles.stepButtonDisabled,
                ]}
                disabled={radiusKm <= MIN_AREA_RADIUS_KM}>
                <Text style={styles.stepButtonText}>-{STEP_LARGE}</Text>
              </Pressable>
              <Pressable
                onPress={() => applyDelta(-STEP_SMALL)}
                style={[
                  styles.stepButton,
                  radiusKm <= MIN_AREA_RADIUS_KM && styles.stepButtonDisabled,
                ]}
                disabled={radiusKm <= MIN_AREA_RADIUS_KM}>
                <MaterialCommunityIcons
                  name="minus"
                  size={20}
                  color={colors.text}
                />
              </Pressable>

              <View style={styles.valueChip}>
                <Text style={styles.valueChipText}>{radiusKm}</Text>
                <Text style={styles.valueChipUnit}>km</Text>
              </View>

              <Pressable
                onPress={() => applyDelta(STEP_SMALL)}
                style={[
                  styles.stepButton,
                  radiusKm >= MAX_AREA_RADIUS_KM && styles.stepButtonDisabled,
                ]}
                disabled={radiusKm >= MAX_AREA_RADIUS_KM}>
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={colors.text}
                />
              </Pressable>
              <Pressable
                onPress={() => applyDelta(STEP_LARGE)}
                style={[
                  styles.stepButton,
                  radiusKm >= MAX_AREA_RADIUS_KM && styles.stepButtonDisabled,
                ]}
                disabled={radiusKm >= MAX_AREA_RADIUS_KM}>
                <Text style={styles.stepButtonText}>+{STEP_LARGE}</Text>
              </Pressable>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>

            <Text style={styles.helperText}>{helperText}</Text>
          </View>

          <Pressable
            onPress={() => void handleSave()}
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save radius</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGray,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.searchBg,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 36,
    fontFamily: fonts.BOLD,
    color: colors.primaryDark,
    marginBottom: 8,
  },
  heroHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
    textAlign: 'center',
  },
  controlsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  stepButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.searchBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  stepButtonText: {
    fontSize: 13,
    fontFamily: fonts.BOLD,
    color: colors.text,
  },
  valueChip: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  valueChipText: {
    fontSize: 22,
    fontFamily: fonts.BOLD,
    color: colors.primaryDark,
  },
  valueChipUnit: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.searchBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.mutedText,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 'auto',
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.BOLD,
  },
});

export default ChangeAreaRadiusScreen;
