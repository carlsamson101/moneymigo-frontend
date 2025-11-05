import React, { useState, useEffect, useRef, forwardRef } from 'react';
import NetInfo from "@react-native-community/netinfo";
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, Image, Alert, Dimensions, TouchableOpacity, TextInput, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveToken, getToken } from '../lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { TextInput as RNTextInput } from "react-native";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

// Dynamic sizing based on screen height
const isSmallScreen = windowHeight < 700;
const BUTTON_SIZE = isSmallScreen ? 60 : 70;
const LOGO_SIZE = isSmallScreen ? 100 : 130;

const NUMBER_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '←'],
];

// --- PIN DOTS INPUT FOR WEB ---
type PinDotsInputWebProps = {
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
};
const PinDotsInputWeb = forwardRef<TextInput, PinDotsInputWebProps>(
  ({ value, onChangeText, autoFocus }, ref) => (
    <Pressable
      style={webPinStyles.pinContainer as any}
      onPress={() => {
        if (ref && 'current' in ref && ref.current) {
          (ref.current as any).focus?.();
        }
      }}
      accessibilityRole="button"
    >
      <View style={webPinStyles.pinDotsRow as any}>
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <View key={i} style={webPinStyles.dotWrap as any}>
              <View
                style={[
                  webPinStyles.dot,
                  value[i] && webPinStyles.dotFilled,
                ]}
              />
            </View>
          ))}
      </View>
      <TextInput
        ref={ref as any}
        value={value}
        onChangeText={t => {
          if (/^\d*$/.test(t) && t.length <= 6) onChangeText(t);
        }}
        style={webPinStyles.hiddenInput as any}
        keyboardType="numeric"
        inputMode="numeric"
        maxLength={6}
        autoFocus={autoFocus}
        secureTextEntry
        caretHidden
        contextMenuHidden
      />
    </Pressable>
  )
);

// --- DIAL PAD FOR NATIVE ---
type PinDotsAndDialProps = {
  pin: string;
  handleDial: (val: string) => void;
};
function PinDotsAndDial({ pin, handleDial }: PinDotsAndDialProps) {
  return (
    <>
      <View style={dialStyles.pinDotsRow}>
        {Array(6).fill(0).map((_, i) => (
          <View key={`dot-${i}`} style={dialStyles.dotWrap}>
            <View style={[dialStyles.dot, pin[i] && dialStyles.dotFilled]} />
          </View>
        ))}
      </View>
      <View style={dialStyles.dialWrap}>
        {NUMBER_ROWS.map((row, i) => (
          <View key={`row-${i}`} style={dialStyles.dialRow}>
            {row.map((num, j) => {
              if (!num) return <View key={`empty-${i}-${j}`} style={dialStyles.dialBtnEmpty} />;
              if (num === '←') {
                return (
                  <TouchableOpacity
                    key={`back-${i}-${j}`}
                    style={dialStyles.dialBtnBack}
                    onPress={() => handleDial(num)}
                    activeOpacity={0.7}
                  >
                    <Text style={dialStyles.dialBackIcon}>⌫</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={`num-${num}-${i}-${j}`}
                  style={dialStyles.dialBtn}
                  onPress={() => handleDial(num)}
                  activeOpacity={0.7}
                  disabled={pin.length >= 6}
                >
                  <Text style={dialStyles.dialNum}>{num}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </>
  );
}

// ---- NATIVE LOGIN ----
function AppLogin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [hasSavedEmail, setHasSavedEmail] = useState(false);
  const [showDial, setShowDial] = useState(false);
  const emailInputRef = useRef<TextInput>(null);

 useEffect(() => {
  (async () => {
    const token = await getToken();
    const net = await NetInfo.fetch();

    if (token && token.token) {
      if (net.isConnected) {
        try {
          // 🔐 Optional: Verify token validity online
          await api.get("/auth/verify", {
            headers: { Authorization: `Bearer ${token.token}` },
          });
          console.log("✅ Token valid — logging in automatically");
          router.replace("/(tabs)");
        } catch (err) {
          console.log("❌ Token invalid, clearing...");
          await AsyncStorage.multiRemove(["migo-email"]);
        }
      } else {
        // 📴 Offline — trust cached login
        console.log("📦 Offline mode: using saved session");
        router.replace("/(tabs)");
      }
    }
  })();
}, []);


  useEffect(() => {
    AsyncStorage.getItem('migo-email').then((migoEmail) => {
      if (migoEmail) {
        setEmail(migoEmail);
        setHasSavedEmail(true);
        setShowDial(true);
      } else {
        setEmail('');
        setHasSavedEmail(false);
        setShowDial(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!hasSavedEmail && /\S+@\S+\.\S+/.test(email)) setShowDial(true);
    else if (!hasSavedEmail) setShowDial(false);
  }, [email, hasSavedEmail]);

  useEffect(() => {
    if (/^\d{6}$/.test(pin) && (email && email.length > 0)) handleLogin(pin);
  }, [pin]);

  const handleLogin = async (inputPin: string) => {
  if (!email) {
    setError('Please enter your email.');
    return;
  }
  if (!/^\d{6}$/.test(inputPin)) {
    setError('PIN must be exactly 6 digits');
    return;
  }

  try {
    const response = await api.post('/auth/login', { email, pin: inputPin });

    if (response.data.needsVerification) {
      router.push({ pathname: '/verify-code', params: { email } });
      return;
    }

    // ✅ 1-day expiry for demo
    const now = new Date();
    const expiry = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    await saveToken({
      token: response.data.user.token,
      firstName: response.data.user.firstName,
      lastName: response.data.user.lastName,
      id: response.data.user.id,
      budgetPeriod: response.data.user.budgetPeriod,
      avatarUrl: response.data.user.avatarUrl || null,
    });

    await AsyncStorage.setItem('authExpiry', expiry.toISOString());
    await AsyncStorage.setItem('migo-email', email);

    // ✅ Initialize offline sync listener
    import("../lib/offlineCache").then(({ initOfflineSyncListener }) => {
      initOfflineSyncListener();
    });

    // ✅ Redirect to index/home screen
    router.replace('/(tabs)');
  } catch (err) {
    console.error('❌ Login failed:', err);
    setError('Login failed. Please try again.');
  }
};


  const handleSwitchAccount = async () => {
    await AsyncStorage.removeItem('migo-email');
    setHasSavedEmail(false);
    setEmail('');
    setPin('');
    setError('');
    setShowDial(false);
    setTimeout(() => emailInputRef.current?.focus(), 200);
  };

  const handleDial = (value: string) => {
    if (value === '←') setPin(pin.slice(0, -1));
    else if (value && pin.length < 6) setPin(pin + value);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.topContent}>
          <Image
            source={require('../assets/images/moneymigo-nobackg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcome}>
            Welcome to <Text style={styles.brand}>MoneyMigo</Text>
          </Text>
          <Text style={styles.tagline}>
            Save smarter. Live better.{'\n'}
            <Text style={styles.taglineAccent}>You've got A Migo.</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.accountLabel}>Account</Text>
          {hasSavedEmail ? (
            <>
              <TouchableOpacity 
                style={styles.emailBadge}
                onPress={handleSwitchAccount}
                activeOpacity={0.7}
              >
                <Text style={styles.accountEmail} numberOfLines={1} ellipsizeMode="tail">
                  {email}
                </Text>
                <Text style={styles.switchAccountText}>Switch</Text>
              </TouchableOpacity>
              <PinDotsAndDial pin={pin} handleDial={handleDial} />
            </>
          ) : (
            <>
              <TextInput
                ref={emailInputRef}
                style={styles.emailInput}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
                autoFocus
              />
              {showDial && <PinDotsAndDial pin={pin} handleDial={handleDial} />}
            </>
          )}
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
          
          <View style={styles.linkContainer}>
            <TouchableOpacity onPress={() => router.push('/reset-pin')}>
              <Text style={styles.forgotPin}>Forgot PIN?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLinkText}>
                Don't have an account? <Text style={styles.registerLink}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---- WEB LOGIN ----
function WebLogin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [hasSavedEmail, setHasSavedEmail] = useState(false);
  const pinInputRef = useRef<RNTextInput>(null);
  const emailInputRef = useRef<RNTextInput>(null);

  useEffect(() => {
  (async () => {
    const token = await getToken();
    const expiry = await AsyncStorage.getItem('authExpiry');
    const net = await NetInfo.fetch();

    if (token && token.token && expiry) {
      const now = new Date();
      const expiryDate = new Date(expiry);

      if (now < expiryDate) {
        if (net.isConnected) {
          try {
            await api.get('/auth/verify', {
              headers: { Authorization: `Bearer ${token.token}` },
            });
            console.log('✅ Token verified online');
            router.replace('/(tabs)');
          } catch (err) {
            console.log('❌ Token invalid, clearing');
            await AsyncStorage.multiRemove(['authExpiry', 'migo-email']);
          }
        } else {
          console.log('📦 Offline but token still valid — login allowed');
          router.replace('/(tabs)');
        }
      } else {
        console.log('⏰ Token expired — forcing re-login');
        await AsyncStorage.multiRemove(['authExpiry', 'migo-email']);
      }
    }
  })();
}, []);


  useEffect(() => {
    AsyncStorage.getItem('migo-email').then((migoEmail) => {
      if (migoEmail) {
        setEmail(migoEmail);
        setHasSavedEmail(true);
        setTimeout(() => pinInputRef.current?.focus(), 300);
      } else {
        setEmail('');
        setHasSavedEmail(false);
        setTimeout(() => emailInputRef.current?.focus(), 300);
      }
    });
  }, []);

  useEffect(() => {
    if (/^\d{6}$/.test(pin) && (email && email.length > 0)) handleLogin(pin);
  }, [pin]);

  const handleLogin = async (inputPin: string) => {
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    if (!/^\d{6}$/.test(inputPin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    try {
      const response = await api.post('/auth/login', { email, pin: inputPin });
if (response.data.needsVerification) {
  router.push({ pathname: '/verify-code', params: { email } });
} else {
  const now = new Date();
  const expiry = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 7 days
  
  await saveToken({
    token: response.data.user.token,
    firstName: response.data.user.firstName,
    lastName: response.data.user.lastName,
    id: response.data.user.id,
    budgetPeriod: response.data.user.budgetPeriod,
    avatarUrl: response.data.user.avatarUrl || null,
  });
  await AsyncStorage.setItem('authExpiry', expiry.toISOString());
  await AsyncStorage.setItem('migo-email', email);
  
  router.replace('/(tabs)');
}

    } catch (err: any) {
      const msg = err.response?.data?.error || 'PIN incorrect';
      setError(msg);
      showAlert("Login Failed", msg);
      setTimeout(() => {
        setPin('');
        pinInputRef.current?.focus();
      }, 500);

    }
  };

  const handleSwitchAccount = async () => {
    await AsyncStorage.removeItem('migo-email');
    setHasSavedEmail(false);
    setEmail('');
    setPin('');
    setError('');
    setTimeout(() => emailInputRef.current?.focus(), 300);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.topContent}>
          <Image
            source={require('../assets/images/moneymigo-nobackg.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcome}>
            Welcome to <Text style={styles.brand}>MoneyMigo</Text>
          </Text>
          <Text style={styles.tagline}>
            Save smarter. Live better.{'\n'}
            <Text style={styles.taglineAccent}>You've got A Migo.</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.accountLabel}>Account</Text>
          {hasSavedEmail ? (
            <>
              <TouchableOpacity 
                style={styles.emailBadge}
                onPress={handleSwitchAccount}
              >
                <Text style={styles.accountEmail}>{email}</Text>
                <Text style={styles.switchAccountText}>Switch</Text>
              </TouchableOpacity>
              <PinDotsInputWeb
                ref={pinInputRef}
                value={pin}
                onChangeText={setPin}
                autoFocus
              />
            </>
          ) : (
            <>
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
                autoFocus
              />
              <PinDotsInputWeb
                ref={pinInputRef}
                value={pin}
                onChangeText={setPin}
              />
            </>
          )}
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
          
          <View style={styles.linkContainer}>
            <TouchableOpacity onPress={() => router.push('/reset-pin')}>
              <Text style={styles.forgotPin}>Forgot PIN?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLinkText}>
                Don't have an account? <Text style={styles.registerLink}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default Platform.OS === 'web' ? WebLogin : AppLogin;

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: isSmallScreen ? 10 : 20,
  },
  topContent: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 10 : 16,
  },
  logo: {
    width: Platform.OS === 'web' ? 600 : LOGO_SIZE,
    height: Platform.OS === 'web' ? 250 : LOGO_SIZE,
    marginBottom: isSmallScreen ? -30 : -20,
  },
  welcome: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: isSmallScreen ? 2 : 2,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: isSmallScreen ? 4 : 8,
  },
  brand: {
    color: '#2563eb',
    fontWeight: '800',
  },
  tagline: {
    fontSize: isSmallScreen ? 13 : 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 18 : 22,
    maxWidth: 280,
  },
  taglineAccent: {
    color: '#10b981',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    width: windowWidth > 400 ? 380 : '100%',
    borderRadius: 24,
    padding: isSmallScreen ? 16 : 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accountLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: isSmallScreen ? 8 : 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emailBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: 12,
    alignSelf: 'stretch',
    marginBottom: isSmallScreen ? 12 : 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 0,
    overflow: 'hidden',
  },
  accountEmail: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
    marginRight: 10,
  },
  switchAccountText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: isSmallScreen ? 12 : 16,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
    fontWeight: '500',
  },
  emailInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: isSmallScreen ? 12 : 16,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: isSmallScreen ? 12 : 16,
    fontWeight: '500',
    width: '100%',
    alignSelf: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: 12,
    marginTop: isSmallScreen ? 8 : 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignSelf: 'stretch',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  linkContainer: {
    marginTop: isSmallScreen ? 8 : 12,
    gap: isSmallScreen ? 4 : 6,
    alignItems: 'center',
  },
  forgotPin: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  registerLinkText: {
    color: '#64748b',
    fontSize: 14,
  },
  registerLink: {
    fontWeight: '700',
    color: '#2563eb',
  },
});

// --- DIAL PAD STYLES ---
const dialStyles = StyleSheet.create({
  pinDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: isSmallScreen ? 8 : 10,
    gap: 7,
  },
  dotWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#cbd5e1",
  },
  dotFilled: {
    backgroundColor: "#2563eb",
  },
  dialWrap: {
    marginTop: isSmallScreen ? 6 : 8,
    marginBottom: isSmallScreen ? 6 : 8,
  },
  dialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 6 : 8,
    gap: isSmallScreen ? 8 : 10,
  },
  dialBtn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  dialBtnBack: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dialNum: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  dialBackIcon: {
    fontSize: isSmallScreen ? 28 : 32,
    color: '#64748b',
    fontWeight: 'bold',
  },
  dialBtnEmpty: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: 'transparent',
  },
});

// --- WEB PIN DOTS STYLES ---
const webPinStyles = {
  pinContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 5,
    width: '100%',
    alignSelf: 'center',
    margin: '20px 0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  pinDotsRow: {
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    width: '100%',
  },
  dotWrap: {
    width: 24,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
    transition: 'background 0.2s',
  },
  dotFilled: {
    backgroundColor: '#2563eb',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    zIndex: -1,
  },
};