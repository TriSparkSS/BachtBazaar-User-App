import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const bottomBarHeight = Platform.OS === 'ios' ? 80 : 65;

const colors = {
	bg: '#ffffff',
	black: '#000000',
	darkgreen: '#38B44A',
	lightgreen: '#56BE15',
	red: '#CC0000',
	redOrange: '#E31C5F',
	blue: '#545EAF',
	white: '#ffffff',
	combinedColor: '#EDFBF8',
	darkblue: '#1B202D',
	gray: '#292F3F',
	darkGray: '#333333',
	lightGray: '#666666',
	lighterGray: '#999999',
	searchBg: '#F5F5F5',
	orange: '#FF6B35',
	darkpink: '#4B164C',
	lightpink: '#E31C5F',
	yellow: '#FFD93D',
	gradientRed: '#E53935',
	gradientOrange: '#FF6D00',
	pastelYellow: '#FFF3E0',
	pastelPurple: '#F3E5F5',
	pastelBlue: '#E3F2FD',
	pastelGreen: '#E8F5E9',
	pastelOrange: '#FFE0B2',
	borderGray: '#E0E0E0'
};

const fonts = {
	BOLD: 'ProductSans-Bold',
	ITALIC: 'ProductSans-Italic',
	BOLD_ITALIC: 'ProductSans-Bold-Italic',
};

export { screenWidth, screenHeight, colors, fonts, bottomBarHeight };
