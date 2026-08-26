import { CommonActions, NavigationProp } from '@react-navigation/native';
import { MainStackParamList } from '../../../navigation/types';

type CircleNav = NavigationProp<MainStackParamList>;

const popToName = (
  navigation: CircleNav,
  name: keyof MainStackParamList,
  fallback: 'navigate' | 'replace',
) => {
  navigation.dispatch(state => {
    const index = state.routes.map(route => route.name).lastIndexOf(name);
    if (index >= 0) {
      return CommonActions.reset({
        ...state,
        index,
        routes: state.routes.slice(0, index + 1),
      });
    }
    return fallback === 'replace'
      ? CommonActions.replace(name)
      : CommonActions.navigate({ name });
  });
};

/** Leave Bachat Circle and return to Home — never goBack() into Feed. */
export const exitBachatCircleToHome = (navigation: CircleNav) => {
  popToName(navigation, 'BottomStack', 'navigate');
};

/** Open the circle list without stacking another BachatCircle on Feed. */
export const openBachatCircleList = (navigation: CircleNav) => {
  popToName(navigation, 'BachatCircle', 'replace');
};
