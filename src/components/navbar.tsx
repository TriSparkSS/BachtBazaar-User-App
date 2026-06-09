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
  const formattedSubtitle = subtitle.replace(/^Work\s*-\s*/i, '').trim();

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleSection}>
            <Text style={styles.locationTitle}>{title}</Text>
            <View style={styles.locationSubRow}>
              <TouchableOpacity style={styles.inlineMenuButton} onPress={onMenuPress}>
                <AppIcon name="menu" size={14} />
              </TouchableOpacity>
              <Text style={styles.locationSubtext} numberOfLines={1}>
                {formattedSubtitle}
              </Text>
              <Text style={styles.chevronText}>⌄</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <AppIcon name="bell" size={21} />
          </TouchableOpacity>
        </View>
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
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  titleSection: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  locationTitle: {
    fontSize: 17,
    fontFamily: fonts.BOLD,
    color: '#202843',
    lineHeight: 22,
  },
  locationSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  locationSubtext: {
    fontSize: 11,
    color: '#4A5672',
    fontFamily: fonts.BOLD,
    flexShrink: 1,
    maxWidth: '84%',
    lineHeight: 14,
  },
  chevronText: {
    fontSize: 12,
    color: '#202843',
    fontFamily: fonts.BOLD,
    marginTop: -1,
  },
  inlineMenuButton: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  iconButton: {
    padding: 4,
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
