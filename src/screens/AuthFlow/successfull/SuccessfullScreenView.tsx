import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
    ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import BackgroundImg from '../../../assets/image/Background.png';
import LogoSVG from '../../../assets/image/BachatBazaarLogo.svg';
import TickSVG from '../../../assets/image/Tick.svg';
import VectorSVG from '../../../assets/image/Vector.svg';
import { colors, fonts } from '../../../helpers/styles';

const { width, height } = Dimensions.get('window');

interface SuccessfullScreenViewProps {
    onGoToDashboard: () => void;
    onSetUpProfile: () => void;
}

const SuccessfullScreenView: React.FC<SuccessfullScreenViewProps> = ({
    onGoToDashboard,
    onSetUpProfile,
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

            <View style={styles.topRightVector}>
                <VectorSVG width={width * 0.4} height={width * 0.4} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Logo Area */}
                <View style={styles.logoContainer}>
                    <LogoSVG width={100} height={100} />
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleBachat}>Bachat</Text>
                        <Text style={styles.titleBazaar}> Bazaar</Text>
                    </View>
                    <Text style={styles.subtitleSmall}>Discover Local Deals Near You</Text>
                </View>

                {/* Main Card */}
                <View style={styles.card}>
                    <View style={styles.checkmarkOuter}>
                        <View style={styles.checkmarkInner}>
                            <TickSVG width={50} height={50} />
                        </View>
                    </View>

                    <Text style={styles.heading}>Successful</Text>
                    <Text style={styles.description}>
                        Create a new password. Ensure it differs from previous ones for security
                    </Text>

                    {/* Action Buttons */}
                    <TouchableOpacity onPress={onGoToDashboard}>
                        <LinearGradient
                            colors={['#E0A361', '#CF9150']}
                            style={styles.actionButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.actionButtonText}>Go to Dashboard</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.orText}>or</Text>

                    <TouchableOpacity onPress={onSetUpProfile}>
                        <LinearGradient
                            colors={['#E0A361', '#CF9150']}
                            style={styles.actionButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.actionButtonText}>Set up Your Profile</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default SuccessfullScreenView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: height * 0.08,
        marginBottom: 20,
    },
    titleContainer: {
        flexDirection: 'row',
        marginTop: 5,
    },
    titleBachat: {
        fontSize: 26,
        fontFamily: fonts.BOLD,
        color: '#FF8C42',
    },
    titleBazaar: {
        fontSize: 26,
        fontFamily: fonts.BOLD,
        color: '#4CAF50',
    },
    subtitleSmall: {
        fontSize: 16,
        color: '#333',
        marginTop: 2,
        fontFamily: fonts.BOLD,
    },
    card: {
        width: width * 0.9,
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // Glassmorphism-like translucency
        borderRadius: 35,
        padding: 25,
        paddingVertical: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        marginTop: 10,
    },
    checkmarkOuter: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#E0A361',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#fff',
        // Shadow for the circle
        shadowColor: '#eaeaeaff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    checkmarkInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ffffffff', // Light peach/gold background
        justifyContent: 'center',
        alignItems: 'center',
    },
    heading: {
        fontSize: 28,
        fontFamily: fonts.BOLD,
        color: '#1A1A1A',
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        fontFamily: fonts.BOLD,
        color: '#808080',
        textAlign: 'center',
        marginBottom: 35,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    actionButton: {
        width: width * 0.75,
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#E0A361',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    actionButtonText: {
        fontSize: 18,
        fontFamily: fonts.BOLD,
        color: '#fff',
    },
    buttonIcon: {
        marginLeft: 10,
    },
    orText: {
        fontSize: 20,
        fontFamily: fonts.BOLD,
        color: '#999',
        marginVertical: 15,
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
