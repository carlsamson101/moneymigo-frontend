import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { Alert } from 'react-native'; // ✅ Add this import
import AsyncStorage from '@react-native-async-storage/async-storage';

const showAlert = (title: string, message: string, onConfirm?: () => void) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onConfirm) onConfirm();
  } else {
    Alert.alert(title, message, [{ text: "OK", onPress: onConfirm }]);
  }
};

const { width: windowWidth } = Dimensions.get('window');

export default function Register() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pinRef = useRef<TextInput>(null);

  const handleRegister = async () => {
  if (!firstName || !lastName || !email || !pin) {
    setError('All fields required');
    return;
  }
  if (!/^\d{6}$/.test(pin)) {
    setError('PIN must be exactly 6 digits');
    pinRef.current?.focus();
    return;
  }

  if (loading) return; // prevent double click
  setLoading(true);

try {
    const res = await api.post('/auth/register', {
    firstName,
    lastName,
    email,
    pin,
  });

  console.log('✅ Registration response:', res.data);

  if (res.data.success) {
    await AsyncStorage.setItem('migo-email', email);
    setError('');

    showAlert(
      'Account Created 🎉',
      'Your account has been created successfully. Proceed to login?',
      () => router.push('/login')
    );
  } else {
    const msg = res.data.error || 'Registration failed';
    setError(msg);
    showAlert('Registration Failed', msg);
  }
} catch (err: any) {
  console.error('❌ Registration error:', err.response?.data || err.message);
  const msg =
    err.message?.includes('Network Error')
      ? 'Please check your internet connection.'
      : err.response?.data?.error || 'Server error';
  setError(msg);
  showAlert('Error', msg);
} finally {
  setLoading(false);
}
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/moneymigo-nobackg.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.appTitle}>MoneyMigo</Text>
          <Text style={styles.subtitle}>Start your savings journey</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.description}>Join thousands saving smarter every day</Text>
          
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                ref={lastNameRef}
                style={styles.input}
                placeholder="Enter your last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="your.email@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
                onSubmitEditing={() => pinRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Security PIN</Text>
              <TextInput
                ref={pinRef}
                style={[styles.input, styles.pinInput]}
                placeholder="••••••"
                value={pin}
                onChangeText={(text) => {
                  if (/^\d*$/.test(text) && text.length <= 6) {
                    setPin(text);
                  }
                }}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Text style={styles.hint}>Choose a 6-digit PIN to secure your account</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By creating an account, you agree to our{'\n'}
          <Text style={styles.footerLink}>Terms of Service</Text> and <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: Platform.OS === 'web' ? Math.min(400, windowWidth * 0.3) : 240,
    height: Platform.OS === 'web' ? Math.min(140, windowWidth * 0.1) : 100,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    width: windowWidth > 400 ? 420 : '100%',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
  },
  formSection: {
    width: '100%',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  pinInput: {
    letterSpacing: 8,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    width: '100%',
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
  button: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  loginLink: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 15,
  },
  loginLinkBold: {
    fontWeight: '700',
    color: '#2563eb',
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#2563eb',
    fontWeight: '600',
  },
});