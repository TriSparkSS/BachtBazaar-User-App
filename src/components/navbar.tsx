import React, { useRef } from 'react';
import { TextInput, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTextInput } from './AppTextInput';
import { colors, fonts } from '../helpers/styles';

interface NavbarProps {
  onMenuPress?: () => void;
  onScannerPress?: () => void;
  onCartPress?: () => void;
  onNotificationPress?: () => void;
  onVoicePress?: () => void;
  onLocationPress?: () => void;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onClearSearch?: () => void;
  isListening?: boolean;
  notificationUnreadCount?: number;
  cartItemCount?: number;
  /** Coach-mark measure targets (Android needs collapsable={false}). */
  headerRef?: React.RefObject<View | null>;
  menuRef?: React.RefObject<View | null>;
  headerActionsRef?: React.RefObject<View | null>;
  searchRef?: React.RefObject<View | null>;
}

const Navbar: React.FC<NavbarProps> = ({
  onMenuPress,
  onCartPress,
  onNotificationPress,
  onVoicePress,
  onLocationPress,
  title = 'Bacht Bazaar',
  subtitle = 'Work - Mohan Sharn',
  showSearch = true,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  isListening = false,
  notificationUnreadCount = 0,
  cartItemCount = 0,
  headerRef,
  menuRef,
  headerActionsRef,
  searchRef,
}) => {
  const searchInputRef = useRef<TextInput>(null);
  const formattedSubtitle = subtitle.replace(/^Work\s*-\s*/i, '').trim();
  const locationLabel = formattedSubtitle
    ? `Work - ${formattedSubtitle}`
    : title || 'Work - Select location';
  const badgeLabel =
    notificationUnreadCount > 99 ? '99+' : String(notificationUnreadCount);
  const cartBadgeLabel = cartItemCount > 99 ? '99+' : String(cartItemCount);

  return (
    <>
      <View style={styles.header}>
        <View ref={menuRef} collapsable={false} style={styles.menuHighlightWrap}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onMenuPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <MaterialCommunityIcons name="menu" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <View ref={headerRef} collapsable={false} style={styles.titleSection}>
          <TouchableOpacity
            style={styles.locationRow}
            activeOpacity={0.75}
            onPress={onLocationPress}
          >
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => searchInputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <MaterialCommunityIcons name="magnify" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <View ref={headerActionsRef} collapsable={false}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onCartPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                cartItemCount > 0 ? `Open cart, ${cartItemCount} items` : 'Open cart'
              }
            >
              <MaterialCommunityIcons name="cart-outline" size={22} color="#1A1A1A" />
              {cartItemCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartBadgeLabel}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
          {notificationUnreadCount > 0 ? (
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={onNotificationPress}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color="#1A1A1A" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeLabel}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {showSearch ? (
        <View ref={searchRef} collapsable={false} style={styles.searchHighlightWrap}>
          <TouchableOpacity
            style={[styles.searchContainer, isListening && styles.searchContainerListening]}
            activeOpacity={1}
            onPress={() => searchInputRef.current?.focus()}>
            <MaterialCommunityIcons name="magnify" size={20} color="#9AA3B2" />
            <AppTextInput
              ref={searchInputRef}
              containerStyle={styles.searchInputWrap}
              focusedContainerStyle={styles.searchInputFocused}
              style={styles.searchInput}
              placeholder={isListening ? 'Listening…' : 'Search for products, stores...'}
              placeholderTextColor="#9AA3B2"
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
                <MaterialCommunityIcons name="close-circle" size={18} color="#9AA3B2" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onVoicePress}
                accessibilityRole="button"
                accessibilityLabel={isListening ? 'Stop voice search' : 'Search by voice'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name={isListening ? 'microphone' : 'microphone-outline'}
                  size={20}
                  color={isListening ? '#E53935' : '#9AA3B2'}
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );
};

export default Navbar;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 4,
  },
  menuHighlightWrap: {
    borderRadius: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.gradientRed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: fonts.BOLD,
    lineHeight: 11,
  },
  searchHighlightWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 24,
    gap: 8,
  },
  searchContainerListening: {
    borderWidth: 1,
    borderColor: '#F5A3A3',
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
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
    fontFamily: fonts.BOLD,
    minHeight: 0,
  },
});
