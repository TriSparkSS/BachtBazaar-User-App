import React, { useRef } from 'react';
import { TextInput, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTextInput } from './AppTextInput';
import { colors, fonts } from '../helpers/styles';
interface NavbarProps {
  onMenuPress?: () => void;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onClearSearch?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onMenuPress,
  title = 'Bacht Bazaar',
  subtitle = 'Work - Mohan Sharn',
  showSearch = true,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
}) => {
  const searchInputRef = useRef<TextInput>(null);
  const formattedSubtitle = subtitle.replace(/^Work\s*-\s*/i, '').trim();

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <MaterialCommunityIcons name="menu" size={24} color="#202843" />
        </TouchableOpacity>

        <View style={styles.titleSection}>
          <Text style={styles.locationTitle}>{title}</Text>
          <TouchableOpacity style={styles.locationSubRow} activeOpacity={0.75}>
            <Text style={styles.locationSubtext} numberOfLines={1}>
              {formattedSubtitle ? `Work - ${formattedSubtitle}` : 'Work - Select location'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color="#202843" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <MaterialCommunityIcons name="bell-outline" size={24} color="#202843" />
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.searchContainer}
            activeOpacity={1}
            onPress={() => searchInputRef.current?.focus()}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
            <AppTextInput
              ref={searchInputRef}
              containerStyle={styles.searchInputWrap}
              focusedContainerStyle={styles.searchInputFocused}
              style={styles.searchInput}
              placeholder="Search Product..."
              placeholderTextColor={colors.lighterGray}
              returnKeyType="search"
              value={searchValue}
              onChangeText={onSearchChange}
              onSubmitEditing={onSearchSubmit}
            />
            {searchValue.trim() ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onClearSearch}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.lightGray} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.qrButton} activeOpacity={0.82}>
            <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

export default Navbar;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#D8E2F0',
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  titleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  locationTitle: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: '#202843',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  locationSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  locationSubtext: {
    fontSize: 12,
    color: '#4A5672',
    fontFamily: fonts.BOLD,
    flexShrink: 1,
    maxWidth: '92%',
    lineHeight: 15,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#F0C4C4',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  searchInputFocused: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  searchInput: {
    fontSize: 13,
    color: colors.darkGray,
    padding: 0,
    fontFamily: fonts.BOLD,
    minHeight: 0,
  },  qrButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
});
