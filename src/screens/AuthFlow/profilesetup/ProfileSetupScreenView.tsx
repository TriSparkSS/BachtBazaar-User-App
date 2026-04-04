import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BackgroundImg from '../../../assets/image/Background.png';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface ProfileSetupScreenViewProps {
    name: string;
    setName: (name: string) => void;
    gender: 'Male' | 'Female';
    setGender: (gender: 'Male' | 'Female') => void;
    address: string;
    setAddress: (address: string) => void;
    onComplete: () => void;
}

const ProfileSetupScreenView: React.FC<ProfileSetupScreenViewProps> = ({
    name,
    setName,
    gender,
    setGender,
    address,
    setAddress,
    onComplete,
}) => {
    return (
        <View style={styles.container}>
            {/* Background */}
            <View style={StyleSheet.absoluteFillObject}>
                <Image
                    source={BackgroundImg}
                    style={{ width: width, height: height }}
                    resizeMode="cover"
                />
            </View>

            {/* Top Right Vector */}
            <View style={styles.topRightVector}>
                <VectorSVG width={width * 0.4} height={width * 0.4} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.profileImageContainer}>
                            <Image
                                source={{ uri: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' }}
                                style={styles.profileImage}
                            />
                            <TouchableOpacity style={styles.editButton}>
                                <Icon name="pencil" size={20} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.userNameText}>Your name</Text>
                        <Text style={styles.userPhoneText}>7865334567</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Your Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your Name"
                            placeholderTextColor="#999"
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Gender Selection */}
                        <View style={styles.genderContainer}>
                            <TouchableOpacity 
                                style={styles.genderButton} 
                                onPress={() => setGender('Male')}
                            >
                                {gender === 'Male' ? (
                                    <LinearGradient
                                        colors={['#E0A361', '#CF9150']}
                                        style={styles.activeGenderGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.activeGenderText}>Male</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.inactiveGenderButton}>
                                        <Text style={styles.inactiveGenderText}>Male</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.genderButton} 
                                onPress={() => setGender('Female')}
                            >
                                {gender === 'Female' ? (
                                    <LinearGradient
                                        colors={['#E0A361', '#CF9150']}
                                        style={styles.activeGenderGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.activeGenderText}>Female</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.inactiveGenderButton}>
                                        <Text style={styles.inactiveGenderText}>Female</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Your Address (optional)</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Or"
                            placeholderTextColor="#999"
                            multiline={true}
                            numberOfLines={4}
                            value={address}
                            onChangeText={setAddress}
                        />

                        {/* Complete Button */}
                        <TouchableOpacity onPress={onComplete} style={styles.completeButtonContainer}>
                            <LinearGradient
                                colors={['#F1DBCB', '#EBD0C0']} // Light beige/orange as per image
                                style={styles.completeButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.completeButtonText}>Complete Profile</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default ProfileSetupScreenView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: height * 0.1, // Responsive top spacing
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    profileImageContainer: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 4,
        borderColor: '#029AF1',
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 15,
    },
    profileImage: {
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    editButton: {
        position: 'absolute',
        bottom: 5,
        right: 15,
        backgroundColor: '#fff',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userNameText: {
        fontSize: 22,
        fontFamily: fonts.BOLD,
        color: '#1A1A1A',
        marginBottom: 5,
    },
    userPhoneText: {
        fontSize: 16,
        fontFamily: fonts.BOLD,
        color: '#808080',
    },
    formContainer: {
        width: width * 0.9,
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 18,
        fontFamily: fonts.BOLD,
        color: '#1A1A1A',
        marginBottom: 10,
        marginTop: 20,
    },
    input: {
        width: '100%',
        height: 60,
        backgroundColor: '#F5F5F5',
        borderRadius: 15,
        paddingHorizontal: 20,
        fontSize: 18,
        fontFamily: fonts.BOLD,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        marginBottom: 10,
    },
    genderButton: {
        width: '48%',
        height: 50,
    },
    activeGenderGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inactiveGenderButton: {
        width: '100%',
        height: '100%',
        backgroundColor: '#DCDCDC',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeGenderText: {
        fontSize: 18,
        fontFamily: fonts.BOLD,
        color: '#fff',
    },
    inactiveGenderText: {
        fontSize: 18,
        fontFamily: fonts.BOLD,
        color: '#fff',
    },
    textArea: {
        width: '100%',
        height: 120,
        backgroundColor: '#F5F5F5',
        borderRadius: 15,
        paddingHorizontal: 20,
        paddingTop: 15,
        fontSize: 18,
        fontFamily: fonts.BOLD,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        textAlignVertical: 'top',
    },
    completeButtonContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    completeButton: {
        width: '100%',
        height: 65,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    completeButtonText: {
        fontSize: 20,
        fontFamily: fonts.BOLD,
        color: '#fff',
    },
    topRightVector: {
        position: 'absolute',
        top: 40,
        right: 0,
        width: 150,
        height: 200,
        overflow: 'visible',
    },
});
