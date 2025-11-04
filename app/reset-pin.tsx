import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Modal,
  TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

export default function ResetPinScreen() {
  const router = useRouter();
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'done'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const isValidEmail = email.includes('@') && email.includes('.');

  // Step 1: Send OTP code to email
  const handleSendCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/send-pin-reset-code', { email });
      setStep('otp');
      setCode('');
      setMessage('Check your email for the 6-digit code.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error sending code.');
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    setLoading(false);
  };

  // Step 2: Validate OTP code and open PIN modal
  const handleCheckCode = () => {
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setModalVisible(true);
  };

  // Step 3: Set new PIN
  const handleResetPin = async () => {
    setError('');
    setMessage('');
    if (!/^\d{6}$/.test(newPin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-pin', { email, code, newPin });
      setStep('done');
      setModalVisible(false);
      setMessage('PIN successfully reset! Redirecting to login...');
      setTimeout(() => router.replace('/login'), 1700);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error resetting PIN.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background Decorations */}
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={28} color="#2563EB" />
            </View>
            <Text style={styles.brand}>MoneyMigo</Text>
            <Text style={styles.subtitle}>Reset Your PIN</Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[styles.progressDot, step !== 'email' && styles.progressDotComplete]}>
                {step !== 'email' ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={styles.progressNumber}>1</Text>
                )}
              </View>
              <Text style={styles.progressLabel}>Email</Text>
            </View>
            <View style={[styles.progressLine, step === 'done' && styles.progressLineComplete]} />
            <View style={styles.progressStep}>
              <View style={[
                styles.progressDot, 
                step === 'done' && styles.progressDotComplete,
                step === 'otp' && styles.progressDotActive
              ]}>
                {step === 'done' ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={styles.progressNumber}>2</Text>
                )}
              </View>
              <Text style={styles.progressLabel}>Verify</Text>
            </View>
          </View>

          {/* Step 1: Email */}
          {step === 'email' && (
            <Animated.View 
              style={[
                styles.card,
                { transform: [{ translateX: shakeAnimation }] }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail-outline" size={32} color="#2563EB" />
                </View>
                <Text style={styles.cardTitle}>Enter Your Email</Text>
                <Text style={styles.cardSubtitle}>We'll send you a verification code</Text>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputContainer, error && styles.inputContainerError]}>
                  <Ionicons name="mail" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                    placeholderTextColor="#CBD5E1"
                  />
                  {email && isValidEmail && (
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  )}
                </View>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, (!isValidEmail || loading) && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading || !isValidEmail}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Sending...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Send Verification Code</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={16} color="#64748B" />
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 2: OTP code input */}
          {step === 'otp' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="shield-checkmark-outline" size={32} color="#2563EB" />
                </View>
                <Text style={styles.cardTitle}>Verify Code</Text>
                <Text style={styles.cardSubtitle}>Enter the code sent to</Text>
                <View style={styles.emailBadge}>
                  <Ionicons name="mail" size={14} color="#2563EB" />
                  <Text style={styles.emailBadgeText}>{email}</Text>
                </View>
              </View>

              <View style={styles.codeInputWrapper}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={[styles.codeInput, error && styles.inputError]}
                  placeholder="000000"
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
                  <View style={styles.codeCheckmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                  </View>
                )}
              </View>

              {message && !error && (
                <View style={styles.messageContainer}>
                  <Ionicons name="information-circle" size={18} color="#2563EB" />
                  <Text style={styles.messageText}>{message}</Text>
                </View>
              )}

              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, (code.length !== 6 || loading) && styles.buttonDisabled]}
                onPress={handleCheckCode}
                disabled={loading || code.length !== 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Verify Code</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleSendCode}
              >
                <Ionicons name="refresh" size={16} color="#2563EB" />
                <Text style={styles.secondaryButtonText}>Resend Code</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => { 
                  setStep('email'); 
                  setMessage(''); 
                  setError(''); 
                  setCode('');
                }}
              >
                <Ionicons name="arrow-back" size={16} color="#64748B" />
                <Text style={styles.backButtonText}>Change Email</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Modal for PIN reset */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="lock-closed" size={32} color="#2563EB" />
                  </View>
                  <Text style={styles.modalTitle}>Create New PIN</Text>
                  <Text style={styles.modalSubtitle}>Choose a secure 6-digit PIN</Text>
                </View>

                <View style={styles.pinInputWrapper}>
                  <Text style={styles.inputLabel}>New PIN</Text>
                  <View style={styles.pinInputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.pinInput}
                      placeholder="••••••"
                      value={newPin}
                      onChangeText={(text) => {
                        setNewPin(text);
                        setError('');
                      }}
                      keyboardType="numeric"
                      maxLength={6}
                      secureTextEntry
                      autoFocus
                      placeholderTextColor="#CBD5E1"
                    />
                    {newPin.length === 6 && (
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    )}
                  </View>
                </View>

                <View style={styles.pinInputWrapper}>
                  <Text style={styles.inputLabel}>Confirm PIN</Text>
                  <View style={styles.pinInputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.pinInput}
                      placeholder="••••••"
                      value={confirmPin}
                      onChangeText={(text) => {
                        setConfirmPin(text);
                        setError('');
                      }}
                      keyboardType="numeric"
                      maxLength={6}
                      secureTextEntry
                      placeholderTextColor="#CBD5E1"
                    />
                    {confirmPin.length === 6 && confirmPin === newPin && (
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    )}
                  </View>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.pinStrengthInfo}>
                  <Ionicons name="information-circle" size={16} color="#64748B" />
                  <Text style={styles.pinStrengthText}>
                    Choose a PIN that's easy to remember but hard to guess
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.button, (newPin.length !== 6 || confirmPin.length !== 6 || loading) && styles.buttonDisabled]}
                  onPress={handleResetPin} 
                  disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons name="checkmark-done" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Reset PIN</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Success State */}
          {step === 'done' && (
            <View style={styles.successCard}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
              </View>
              <Text style={styles.successTitle}>PIN Reset Successful!</Text>
              <Text style={styles.successMessage}>{message}</Text>
              <View style={styles.loadingDots}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
  },
  backgroundCircle1: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#EFF6FF',
    opacity: 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#DBEAFE',
    opacity: 0.3,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: { 
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  brand: {
    fontSize: 26,
    color: '#2563EB',
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 40,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressDotActive: {
    backgroundColor: '#2563EB',
  },
  progressDotComplete: {
    backgroundColor: '#16A34A',
  },
  progressNumber: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  progressLine: {
    height: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    marginBottom: 28,
  },
  progressLineComplete: {
    backgroundColor: '#16A34A',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 6,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  emailBadgeText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  inputContainerError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 12,
  },
  codeInputWrapper: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  codeInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
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
  codeCheckmark: {
    position: 'absolute',
    right: 12,
    top: 38,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
  },
  messageText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  secondaryButtonText: {
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
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  pinInputWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  pinInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pinInput: {
    flex: 1,
    fontSize: 20,
    letterSpacing: 6,
    color: '#1E293B',
    paddingVertical: 12,
    fontWeight: '700',
  },
  pinStrengthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  pinStrengthText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    maxWidth: 380,
    width: '100%',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
});