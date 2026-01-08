import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


export default function FeedbackSurvey() {
  const router = useRouter();


  const handleOpenLink = async (linkType: string) => {
    // Replace these URLs with your actual Google Form/Sheet links
    const links: Record<string, string> = {
      functional: 'https://forms.gle/c2JwMmXo49mby4M47',
      pssuq: 'https://forms.gle/w5RhdrEdueVLHQkY7',
      bugReport: 'https://forms.gle/HXGo3njWKm5HHA1L8',
      recommendation: 'https://forms.gle/HXGo3njWKm5HHA1L8'
    };


    const url = links[linkType];


    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open link');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open link');
    }
  };


  const handleBackPress = () => {
    router.push('/(tabs)');
  };


  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#F4B942" />
      </TouchableOpacity>


      {/* Header with Gradient */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💬</Text>
        <Text style={styles.headerTitle}>Feedback & Survey</Text>
        <Text style={styles.headerSubtitle}>Help us improve your experience</Text>
      </View>


      <View style={styles.content}>
        {/* Survey Forms Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Survey Forms</Text>
          <Text style={styles.sectionDescription}>
            Take a moment to fill out our surveys and help us understand your experience better.
          </Text>


          <TouchableOpacity
            style={styles.surveyCard}
            onPress={() => handleOpenLink('functional')}
            activeOpacity={0.7}
          >
            <View style={[styles.surveyIcon, { backgroundColor: '#F4B942' }]}>
              <Text style={styles.surveyIconText}>📊</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>Functional Survey</Text>
              <Text style={styles.surveyDescription}>
                Evaluate the app's features and functionality
              </Text>
            </View>
            <Text style={[styles.surveyArrow, { color: '#F4B942' }]}>→</Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.surveyCard}
            onPress={() => handleOpenLink('pssuq')}
            activeOpacity={0.7}
          >
            <View style={[styles.surveyIcon, { backgroundColor: '#C49A3C' }]}>
              <Text style={styles.surveyIconText}>⭐</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>PSSUQ Survey</Text>
              <Text style={styles.surveyDescription}>
                Post-Study System Usability Questionnaire
              </Text>
            </View>
            <Text style={[styles.surveyArrow, { color: '#C49A3C' }]}>→</Text>
          </TouchableOpacity>
        </View>


        {/* Bug Report & Recommendations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Report Issues or Suggest Improvements</Text>
          <Text style={styles.sectionDescription}>
            Found a bug or have a great idea? Share it with us!
          </Text>


          {/* Bug Report Card */}
          <TouchableOpacity
            style={styles.feedbackCard}
            onPress={() => handleOpenLink('bugReport')}
            activeOpacity={0.7}
          >
            <View style={[styles.surveyIcon, { backgroundColor: '#DC8500' }]}>
              <Text style={styles.surveyIconText}>🐛</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>Report a Bug</Text>
              <Text style={styles.surveyDescription}>
                Let us know about any issues you've encountered
              </Text>
            </View>
            <Text style={[styles.surveyArrow, { color: '#DC8500' }]}>→</Text>
          </TouchableOpacity>


          {/* Recommendation Card */}
          <TouchableOpacity
            style={styles.feedbackCard}
            onPress={() => handleOpenLink('recommendation')}
            activeOpacity={0.7}
          >
            <View style={[styles.surveyIcon, { backgroundColor: '#F4B942' }]}>
              <Text style={styles.surveyIconText}>💡</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>Share Recommendation</Text>
              <Text style={styles.surveyDescription}>
                Suggest new features or improvements
              </Text>
            </View>
            <Text style={[styles.surveyArrow, { color: '#F4B942' }]}>→</Text>
          </TouchableOpacity>
        </View>


        {/* Thank You Note */}
        <View style={styles.thankYouCard}>
          <Text style={styles.thankYouIcon}>💛</Text>
          <Text style={styles.thankYouText}>
            Your feedback is valuable to us and helps make this app better for everyone!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 28, 35, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    backgroundColor: '#6B1C23',
    padding: 32,
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 60 : 80,
    paddingBottom: 40,
    ...(Platform.OS === 'web' && {
      backgroundImage: 'linear-gradient(to bottom right, #6B1C23, #8B3A3A)',
    }),
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F4B942',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFE4CC',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B1C23',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8B6B47',
    marginBottom: 16,
    lineHeight: 20,
  },
  surveyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#6B1C23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#F4B942',
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#6B1C23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#F4B942',
  },
  surveyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#F4B942',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  surveyIconText: {
    fontSize: 28,
  },
  surveyInfo: {
    flex: 1,
  },
  surveyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B1C23',
    marginBottom: 4,
  },
  surveyDescription: {
    fontSize: 13,
    color: '#8B6B47',
    lineHeight: 18,
  },
  surveyArrow: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  thankYouCard: {
    backgroundColor: 'rgba(244, 185, 66, 0.15)',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F4B942',
    shadowColor: '#6B1C23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  thankYouIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  thankYouText: {
    flex: 1,
    fontSize: 14,
    color: '#6B1C23',
    lineHeight: 20,
    fontWeight: '600',
  },
});

