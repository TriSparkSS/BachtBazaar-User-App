import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../helpers/styles';

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
            <MaterialCommunityIcons name="menu" size={28} color={colors.darkGray} />
          </TouchableOpacity>
          <View style={styles.titleSection}>
            <Text style={styles.locationTitle}>{title}</Text>
            <View style={styles.locationSubRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} />
              <Text style={styles.locationSubtext} numberOfLines={1}>
                {subtitle}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.darkGray} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <MaterialCommunityIcons name="bell-outline" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={24} color={colors.lighterGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Product ..."
            placeholderTextColor={colors.lighterGray}
          />
        </View>
        <TouchableOpacity style={styles.qrButton}>
          <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.white} />
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  titleSection: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontFamily: fonts.BOLD,
    color: colors.text,
    lineHeight: 22,
  },
  locationSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationSubtext: {
    fontSize: 13,
    color: colors.lightGray,
    fontFamily: fonts.BOLD,
    flexShrink: 1,
    maxWidth: '88%',
  },
  iconButton: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.darkGray,
    padding: 0,
    fontFamily: fonts.BOLD,
  },
  qrButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
});
