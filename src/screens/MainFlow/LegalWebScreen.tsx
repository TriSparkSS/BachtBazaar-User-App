import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { colors, fonts } from '../../helpers/styles';
import { MainStackParamList } from '../../navigation/types';

/**
 * Hides Bachat Bazaar site chrome on legal pages (Slug.jsx):
 * - sticky top <nav> with Home link ("Home" + Verified Policy badge)
 * - article copyright <footer>
 * Keeps article title <header> + prose content. App header stays for exit.
 */
const HIDE_SITE_CHROME_JS = `
(function () {
  var STYLE_ID = 'bb-legal-hide-chrome';
  var CSS = [
    /* Exact legal Slug.jsx chrome */
    'nav',
    'nav.sticky.top-0',
    'nav.bg-white.border-b.border-slate-200',
    '.min-h-screen > nav',
    'article > footer',
    'footer',
    'footer.mt-20',
    'footer.border-t.border-slate-100',
    /* Common site / SPA chrome (do not hide article > header — that is the doc title) */
    'body > header',
    '#root > header',
    '[role="banner"]',
    '[role="navigation"]',
    '.navbar',
    '.nav-bar',
    '.header:not(article header)',
    '.footer',
    '.app-bar',
    '.appbar',
    '.MuiAppBar-root',
    '.MuiBottomNavigation-root',
    'aside',
    '.sidebar',
    '#sidebar',
    '#header',
    '#navbar',
    '#footer',
    '#nav',
    '.site-header',
    '.site-footer',
    '.page-header',
    '.page-footer',
    '.bottom-bar',
    '.bottom-nav',
    '[class*="bottom-bar"]',
    '[class*="BottomBar"]',
    /* Slug.jsx Home control lives in sticky nav; also catch stray root links outside article */
    'nav a[href="/"]',
    'nav a[href="https://bachatbazaar.tech/"]',
    'nav a[href="http://bachatbazaar.tech/"]',
    '.min-h-screen > a[href="/"]'
  ].join(',') + '{display:none!important;visibility:hidden!important;pointer-events:none!important;}';

  var LAYOUT_CSS = [
    'html,body,#root{margin:0!important;padding:0!important;}',
    'body,.min-h-screen{padding-top:0!important;padding-bottom:0!important;background:#F4F6FA!important;}',
    'main,main.max-w-4xl{margin-top:0!important;padding-top:16px!important;padding-bottom:24px!important;}',
    'article{margin-top:0!important;}'
  ].join('');

  function ensureStyle() {
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.type = 'text/css';
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = CSS + LAYOUT_CSS;
  }

  function hideHomeChrome() {
    try {
      var anchors = document.querySelectorAll('a, button');
      for (var i = 0; i < anchors.length; i++) {
        var node = anchors[i];
        if (!node || (node.closest && node.closest('article .prose, article .text-slate-700'))) {
          continue;
        }
        var text = ((node.textContent || '') + '').replace(/\\s+/g, ' ').trim().toLowerCase();
        var href = ((node.getAttribute && node.getAttribute('href')) || '').toLowerCase();
        var isHomeText = text === 'home' || text === 'back to home' || text.indexOf('back to home') !== -1;
        var isRootHref = href === '/' || href === '' || /bachatbazaar\\.tech\\/?$/.test(href);
        if (isHomeText || (isRootHref && isHomeText)) {
          var target = node.closest('nav') || node;
          target.style.setProperty('display', 'none', 'important');
          target.style.setProperty('visibility', 'hidden', 'important');
        }
      }
      var navs = document.querySelectorAll('nav');
      for (var j = 0; j < navs.length; j++) {
        navs[j].style.setProperty('display', 'none', 'important');
      }
      var footers = document.querySelectorAll('footer');
      for (var k = 0; k < footers.length; k++) {
        footers[k].style.setProperty('display', 'none', 'important');
      }
    } catch (e) {}
  }

  function apply() {
    ensureStyle();
    hideHomeChrome();
  }

  apply();

  if (!window.__bbLegalChromeObserver) {
    window.__bbLegalChromeObserver = true;
    var timer = null;
    try {
      var obs = new MutationObserver(function () {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(apply, 60);
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    document.addEventListener('DOMContentLoaded', apply);
    window.addEventListener('load', apply);
    setTimeout(apply, 50);
    setTimeout(apply, 300);
    setTimeout(apply, 1000);
  }
  true;
})();
true;
`;

const LegalWebScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<MainStackParamList, 'LegalWebScreen'>>();
  const route = useRoute<RouteProp<MainStackParamList, 'LegalWebScreen'>>();
  const { title, url } = route.params;
  const webRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerButton} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        {hasError ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="wifi-off" size={40} color={colors.mutedText} />
            <Text style={styles.errorTitle}>Unable to load page</Text>
            <Text style={styles.errorMessage}>
              Please check your connection and try again.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
                setReloadKey(key => key + 1);
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <WebView
              ref={webRef}
              key={reloadKey}
              source={{ uri: url }}
              style={styles.webview}
              injectedJavaScriptBeforeContentLoaded={HIDE_SITE_CHROME_JS}
              injectedJavaScript={HIDE_SITE_CHROME_JS}
              onLoadStart={() => {
                setIsLoading(true);
                setHasError(false);
              }}
              onLoadEnd={() => {
                webRef.current?.injectJavaScript(HIDE_SITE_CHROME_JS);
                setIsLoading(false);
              }}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              onHttpError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              startInLoadingState
              allowsBackForwardNavigationGestures
              javaScriptEnabled
              domStorageEnabled
            />
            {isLoading ? (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

export default LegalWebScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerSafe: {
    backgroundColor: colors.primary,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.BOLD,
  },
  body: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 246, 250, 0.72)',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.BOLD,
  },
  errorMessage: {
    marginTop: 6,
    fontSize: 13,
    color: colors.mutedText,
    fontFamily: fonts.BOLD,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.BOLD,
  },
});
