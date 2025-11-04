// @ts-nocheck
import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { saveToken } from '../lib/auth';
import api from '../lib/api';

export default function VerifyCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-code', { email, code });
      await saveToken({
        token: response.data.user.token,
        firstName: response.data.user.firstName,
        lastName: response.data.user.lastName,
        id: response.data.user.id,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
      // Shake animation on error
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Decorative Background Elements */}
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />

      <Animated.View 
        style={[
          styles.card,
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
        {/* Icon Header */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={40} color="#2563EB" />
          </View>
          <View style={styles.decorativeDot} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code we sent to
      </Text>
        <View style={styles.emailContainer}>
          <Ionicons name="mail" size={16} color="#2563EB" />
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="000000"
            style={[
              styles.input,
              error && styles.inputError,
              code.length === 6 && styles.inputSuccess
            ]}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setError('');
            }}
            keyboardType="numeric"
            maxLength={6}
            autoFocus
            placeholderTextColor="#CBD5E1"
          />
          {code.length === 6 && !error && (
            <View style={styles.inputCheckmark}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
            </View>
          )}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.button,
            (loading || code.length < 6) && styles.buttonDisabled
          ]}
          onPress={handleVerify}
          disabled={loading || code.length < 6}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Verifying...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Verify Code</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Need help?</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpItem}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.helpText}>Code expires in 10 minutes</Text>
          </View>
          <View style={styles.helpItem}>
            <Ionicons name="mail-open-outline" size={16} color="#64748B" />
            <Text style={styles.helpText}>Check spam folder</Text>
          </View>
        </View>

        {/* Resend Option */}
        <TouchableOpacity style={styles.resendButton}>
          <Ionicons name="refresh" size={16} color="#2563EB" />
          <Text style={styles.resendText}>Resend Code</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={18} color="#64748B" />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#EFF6FF',
    opacity: 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#DBEAFE',
    opacity: 0.3,
  },
  card: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  decorativeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 28,
  },
  email: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    width: '100%',
    fontSize: 32,
    letterSpacing: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    textAlign: 'center',
    fontWeight: '700',
    color: '#1E293B',
  },
  inputError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  inputSuccess: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  inputCheckmark: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -12,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpSection: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  resendText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});