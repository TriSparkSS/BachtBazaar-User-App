import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors, fonts } from '../helpers/styles';
import AppIcon from './AppIcon';

interface NavbarProps {
  onMenuPress?: () => void;
  title?: string;
  subtitle?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  onMenuPress,
  title = 'Bacht Bazaar',
  subtitle = 'Work - Mohan Sharn',
}) => {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
            <AppIcon name="menu" size={24} />
          </TouchableOpacity>
          <View style={styles.titleSection}>
            <Text style={styles.locationTitle}>{title}</Text>
            <View style={styles.locationSubRow}>
              <AppIcon name="location" size={12} />
              <Text style={styles.locationSubtext} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <AppIcon name="bell" size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <AppIcon name="search" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Product ..."
            placeholderTextColor={colors.lighterGray}
          />
        </View>
        <TouchableOpacity style={styles.qrButton}>
          <AppIcon name="qr" size={18} />
        </TouchableOpacity>
      </View>
    </>
  );
};

export default Navbar;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleSection: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: fonts.BOLD,
    color: colors.text,
    lineHeight: 20,
  },
  locationSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationSubtext: {
    fontSize: 12,
    color: colors.lightGray,
    fontFamily: fonts.BOLD,
    flexShrink: 1,
    maxWidth: '88%',
  },
  iconButton: {
    padding: 3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.darkGray,
    padding: 0,
    fontFamily: fonts.BOLD,
  },
  qrButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
});
