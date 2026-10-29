import * as LocalAuthentication from 'expo-local-authentication';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { RELOCK_AFTER_MS, START_PATH, USER_AGENT_SUFFIX, WEB_URL } from './config';
import { IN_WEBVIEW_SCHEMES, SYSTEM_SCHEMES, deepLinkToWebUrl, isPortalUrl, isSignedInArea } from './links';
import { StatusScreen } from './StatusScreen';
import { strings } from './strings';

void SplashScreen.preventAutoHideAsync();

const BACKGROUND = '#ffffff';

/** Hosts whose links should open the matching native app (Maps, Waze, WhatsApp) rather than a browser sheet. */
const APP_LINK_HOSTS = ['maps.apple.com', 'waze.com', 'wa.me', 'api.whatsapp.com'];

/** The web portal hides itself behind a pre-launch PIN on ceenaix.com; the app is an approved client. */
const BOOTSTRAP_SCRIPT = `
(function () {
  try { sessionStorage.setItem('ceenaix_preview_access_v1', '1'); } catch (e) {}
  window.CeenAiXApp = { platform: ${JSON.stringify(Platform.OS)} };
  // iOS zooms into any focused input under 16px and stays zoomed; pinning the scale stops that (pinch-zoom still works).
  document.addEventListener('DOMContentLoaded', function () {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
  });
})();
true;
`;

/** iOS reports these when a navigation is cancelled on purpose; they are not connection failures. */
const IGNORED_ERROR_CODES = new Set([-999, 102]);

function openOutside(url: string): void {
  if (SYSTEM_SCHEMES.some((scheme) => url.startsWith(scheme))) {
    void Linking.openURL(url).catch(() => undefined);
    return;
  }
  let host = '';
  let pathname = '';
  try {
    ({ host, pathname } = new URL(url));
  } catch {
    return;
  }
  const isGoogleMaps = /(^|\.)google\.[a-z.]+$/.test(host) && pathname.startsWith('/maps');
  if (isGoogleMaps || APP_LINK_HOSTS.some((appHost) => host === appHost || host.endsWith(`.${appHost}`))) {
    void Linking.openURL(url).catch(() => undefined);
    return;
  }
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

export function App(): React.ReactElement | null {
  // v14 typings default the generic to `undefined`, which collapses the props to `never`.
  const webRef = useRef<WebView<object>>(null);
  const [startUrl, setStartUrl] = useState<string | null>(null);
  const [webKey, setWebKey] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const currentUrl = useRef('');
  const canGoBack = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const splashHidden = useRef(false);

  const hideSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Linking.getInitialURL().then((url) => {
      if (!cancelled) setStartUrl(deepLinkToWebUrl(url) ?? `${WEB_URL}${START_PATH}`);
    });
    const timeout = setTimeout(hideSplash, 10_000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [hideSplash]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const target = deepLinkToWebUrl(url);
      if (target) webRef.current?.injectJavaScript(`window.location.assign(${JSON.stringify(target)}); true;`);
    });
    return () => subscription.remove();
  }, []);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: strings.unlockPrompt });
    if (result.success) setLocked(false);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state !== 'active') {
        setCovered(true);
        return;
      }
      setCovered(false);
      const since = backgroundedAt.current;
      backgroundedAt.current = null;
      if (since === null || Date.now() - since < RELOCK_AFTER_MS || !isSignedInArea(currentUrl.current)) return;
      void (async () => {
        const available = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
        if (!available) return;
        setLocked(true);
        await unlock();
      })();
    });
    return () => subscription.remove();
  }, [unlock]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) return false;
      webRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request: ShouldStartLoadRequest) => {
    const { url } = request;
    if (IN_WEBVIEW_SCHEMES.some((scheme) => url.startsWith(scheme)) || isPortalUrl(url)) return true;
    // Embedded frames (maps, video) stay inside the page; only top-level navigations leave the portal.
    if (Platform.OS === 'ios' && request.isTopFrame === false) return true;
    openOutside(url);
    return false;
  }, []);

  const onNavigationStateChange = useCallback((state: WebViewNavigation) => {
    currentUrl.current = state.url;
    canGoBack.current = state.canGoBack;
  }, []);

  const retry = useCallback(() => {
    setLoadFailed(false);
    setStartUrl((url) => (isPortalUrl(currentUrl.current) ? currentUrl.current : url));
    setWebKey((key) => key + 1);
  }, []);

  if (!startUrl) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <WebView<object>
          key={webKey}
          ref={webRef}
          source={{ uri: startUrl }}
          style={styles.web}
          applicationNameForUserAgent={USER_AGENT_SUFFIX}
          injectedJavaScriptBeforeContentLoaded={BOOTSTRAP_SCRIPT}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onNavigationStateChange={onNavigationStateChange}
          onOpenWindow={({ nativeEvent }) => {
            const { targetUrl } = nativeEvent;
            if (isPortalUrl(targetUrl)) {
              webRef.current?.injectJavaScript(`window.location.assign(${JSON.stringify(targetUrl)}); true;`);
            } else {
              openOutside(targetUrl);
            }
          }}
          onLoadEnd={hideSplash}
          onError={({ nativeEvent }) => {
            hideSplash();
            if (!IGNORED_ERROR_CODES.has(nativeEvent.code)) setLoadFailed(true);
          }}
          onContentProcessDidTerminate={() => webRef.current?.reload()}
          onRenderProcessGone={() => setWebKey((key) => key + 1)}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          sharedCookiesEnabled
          setSupportMultipleWindows
          javaScriptCanOpenWindowsAutomatically
          contentInsetAdjustmentBehavior="never"
          decelerationRate="normal"
          textInteractionEnabled
          webviewDebuggingEnabled={__DEV__}
        />
        {loadFailed ? (
          <StatusScreen testID="screen-offline" title={strings.offlineTitle} body={strings.offlineBody} actionLabel={strings.retry} onAction={retry} />
        ) : null}
      </SafeAreaView>
      {locked ? (
        <StatusScreen
          testID="screen-locked"
          title={strings.lockedTitle}
          body={strings.lockedBody}
          actionLabel={strings.unlock}
          onAction={() => void unlock()}
          fullScreen
        />
      ) : covered ? (
        <View style={[StyleSheet.absoluteFill, styles.cover]} />
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND },
  web: { flex: 1, backgroundColor: BACKGROUND },
  cover: { backgroundColor: BACKGROUND },
});
