import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NativeFullScreenLocationMap from './NativeFullScreenLocationMap';
import { colors, fonts } from '../helpers/styles';
import { showAppAlert } from '../services/appAlert';
import { reverseGeocodeWithGoogle } from '../utils/googleGeocoding';
import {
  fetchPlaceDetails,
  fetchPlacePredictions,
  type PlacePrediction,
  type PlaceSelection,
} from '../utils/googlePlaces';
import { extractCityFromAddress, geocodeAddress } from '../utils/location';
import type { PoiClickEvent } from '../utils/mapPoi';
import { parsePoiClickEvent } from '../utils/mapPoi';
import { MapCoordinates } from '../utils/mapRegion';

export type MapLocationSelection = PlaceSelection;

type FullScreenLocationMapModalProps = {
  visible: boolean;
  coordinates: MapCoordinates;
  markerTitle?: string;
  markerDescription?: string;
  searchable?: boolean;
  onPoiClick?: (event: PoiClickEvent) => void;
  onLocationChange?: (selection: MapLocationSelection) => void;
  onClearLocation?: () => void;
  onClose: () => void;
};

const buildInitialQuery = (markerTitle?: string, markerDescription?: string) => {
  const description = markerDescription?.trim();
  if (description) {
    return description;
  }
  const title = markerTitle?.trim();
  if (title && title.toLowerCase() !== 'selected location' && title.toLowerCase() !== 'your location') {
    return title;
  }
  return '';
};

const FullScreenLocationMapModal: React.FC<FullScreenLocationMapModalProps> = ({
  visible,
  coordinates,
  markerTitle = 'Selected location',
  markerDescription,
  searchable = true,
  onPoiClick,
  onLocationChange,
  onClearLocation,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCoordinates, setSelectedCoordinates] = useState<MapCoordinates | null>(
    coordinates,
  );
  const [cameraCoordinates, setCameraCoordinates] = useState<MapCoordinates>(coordinates);
  const [displayTitle, setDisplayTitle] = useState(markerTitle);
  const [displayDescription, setDisplayDescription] = useState(markerDescription);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(`map-${Date.now()}`);

  const resetFromProps = useCallback(() => {
    const initialQuery = buildInitialQuery(markerTitle, markerDescription);
    const shouldPin =
      Boolean(initialQuery) ||
      (markerTitle.trim().toLowerCase() !== 'search a location' &&
        markerTitle.trim().toLowerCase() !== 'selected location');

    setSelectedCoordinates(shouldPin ? coordinates : null);
    setCameraCoordinates(coordinates);
    setDisplayTitle(shouldPin ? markerTitle : 'Search a location');
    setDisplayDescription(shouldPin ? markerDescription : undefined);
    setQuery(initialQuery);
    setPredictions([]);
    setIsSearching(false);
    setIsResolving(false);
    sessionTokenRef.current = `map-${Date.now()}`;
  }, [coordinates, markerDescription, markerTitle]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    resetFromProps();
    // Only sync from parent when the modal opens, not while the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const applySelection = useCallback(
    (selection: MapLocationSelection) => {
      setSelectedCoordinates({
        latitude: selection.latitude,
        longitude: selection.longitude,
      });
      setCameraCoordinates({
        latitude: selection.latitude,
        longitude: selection.longitude,
      });
      setDisplayTitle(selection.name?.trim() || 'Selected location');
      setDisplayDescription(selection.address);
      setQuery(selection.address);
      setPredictions([]);
      onLocationChange?.(selection);
    },
    [onLocationChange],
  );

  const handleClear = useCallback(() => {
    if (!query.trim() && !selectedCoordinates) {
      onClose();
      return;
    }

    setQuery('');
    setPredictions([]);
    setSelectedCoordinates(null);
    setDisplayTitle('Search a location');
    setDisplayDescription(undefined);
    onClearLocation?.();
  }, [onClearLocation, onClose, query, selectedCoordinates]);

  const runAutocomplete = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const next = await fetchPlacePredictions(trimmed, {
      sessionToken: sessionTokenRef.current,
    });
    setPredictions(next);
    setIsSearching(false);
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        runAutocomplete(value);
      }, 320);
    },
    [runAutocomplete],
  );

  const handleSelectPrediction = useCallback(
    async (prediction: PlacePrediction) => {
      try {
        setIsResolving(true);
        const details = await fetchPlaceDetails(prediction.placeId, {
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = `map-${Date.now()}`;

        if (details) {
          applySelection(details);
          return;
        }

        const fallback = await geocodeAddress(prediction.description);
        if (!fallback) {
          showAppAlert('Location not found', 'Could not place that address on the map.');
          return;
        }

        applySelection({
          ...fallback,
          address: prediction.description,
          city: extractCityFromAddress(prediction.description),
          name: prediction.primaryText,
        });
      } finally {
        setIsResolving(false);
      }
    },
    [applySelection],
  );

  const handleSubmitSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    if (predictions[0]) {
      await handleSelectPrediction(predictions[0]);
      return;
    }

    try {
      setIsResolving(true);
      const result = await geocodeAddress(trimmed);
      if (!result) {
        showAppAlert('Location not found', 'Try a more specific address or pick a suggestion.');
        return;
      }

      applySelection({
        ...result,
        address: trimmed,
        city: extractCityFromAddress(trimmed),
        name: trimmed.split(',')[0]?.trim() || 'Selected location',
      });
    } finally {
      setIsResolving(false);
    }
  }, [applySelection, handleSelectPrediction, predictions, query]);

  const handlePoiClick = useCallback(
    async (event: PoiClickEvent) => {
      if (!searchable) {
        onPoiClick?.(event);
        return;
      }

      const poi = parsePoiClickEvent(event);
      setIsResolving(true);
      try {
        const geocoded = await reverseGeocodeWithGoogle(poi.latitude, poi.longitude);
        applySelection({
          latitude: poi.latitude,
          longitude: poi.longitude,
          address: geocoded.address?.trim() || poi.name || 'Selected location',
          city: geocoded.city || extractCityFromAddress(geocoded.address),
          name: poi.name || geocoded.address?.trim() || 'Selected location',
        });
      } finally {
        setIsResolving(false);
      }
    },
    [applySelection, onPoiClick, searchable],
  );

  const listHeader = useMemo(
    () => (
      <Text style={styles.suggestionHeader}>
        {isSearching ? 'Searching…' : 'Suggestions'}
      </Text>
    ),
    [isSearching],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={styles.root}>
        <NativeFullScreenLocationMap
          coordinates={selectedCoordinates}
          cameraCoordinates={cameraCoordinates}
          markerTitle={displayTitle}
          markerDescription={displayDescription}
          showLocationCard={!searchable}
          onPoiClick={handlePoiClick}
        />

        <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Pressable
              style={styles.closeButton}
              onPress={searchable ? handleClear : onClose}
              accessibilityRole="button"
              accessibilityLabel={searchable ? 'Clear location' : 'Close map'}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>

            {searchable ? (
              <View style={styles.searchWrap}>
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={handleQueryChange}
                  placeholder="Search an address"
                  placeholderTextColor="#99A4B8"
                  returnKeyType="search"
                  onSubmitEditing={handleSubmitSearch}
                  editable={!isResolving}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {isResolving || isSearching ? (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />
                ) : null}
              </View>
            ) : (
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={1}>
                  {displayTitle}
                </Text>
                {displayDescription ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {displayDescription}
                  </Text>
                ) : null}
              </View>
            )}

            <Pressable
              style={styles.doneButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Done">
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>

          {searchable && predictions.length > 0 ? (
            <View style={styles.suggestionsCard}>
              <FlatList
                data={predictions}
                keyExtractor={item => item.placeId}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={listHeader}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.suggestionRow}
                    onPress={() => handleSelectPrediction(item)}
                    disabled={isResolving}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <View style={styles.suggestionTextWrap}>
                      <Text style={styles.suggestionPrimary} numberOfLines={1}>
                        {item.primaryText}
                      </Text>
                      {item.secondaryText ? (
                        <Text style={styles.suggestionSecondary} numberOfLines={1}>
                          {item.secondaryText}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                )}
              />
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default FullScreenLocationMapModal;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF2F8',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E7ECF5',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FC',
    borderWidth: 1,
    borderColor: '#E3E9F3',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchSpinner: {
    marginLeft: 6,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    lineHeight: 16,
  },
  doneButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EEF5FF',
  },
  doneText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: fonts.BOLD,
  },
  suggestionsCard: {
    marginTop: 10,
    marginHorizontal: 16,
    maxHeight: 260,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: '#E7ECF5',
    overflow: 'hidden',
  },
  suggestionHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    fontSize: 11,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEF2F8',
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionPrimary: {
    fontSize: 14,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  suggestionSecondary: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
  },
});
