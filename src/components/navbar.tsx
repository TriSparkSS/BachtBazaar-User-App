import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fonts } from '../helpers/styles';

const Navbar = () => {
  return (
    <>
      {/* Top Bar / Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="menu" size={28} color={colors.darkGray} />
          </TouchableOpacity>
          <View style={styles.titleSection}>
            <Text style={styles.locationTitle}>Bacht Bazaar</Text>
            <View style={styles.locationSubRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color={colors.orange} />
              <Text style={styles.locationSubtext}>Work - Mohan Sharn</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.darkGray} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <MaterialCommunityIcons name="bell-outline" size={28} color="#FF5A5F" />
        </TouchableOpacity>
      </View>

      {/* Search Bar Row */}
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
          <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.darkGray} />
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
  },
  titleSection: {
    justifyContent: 'center',
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkGray,
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
    borderRadius: 30, // Fully rounded
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
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
  },
});
