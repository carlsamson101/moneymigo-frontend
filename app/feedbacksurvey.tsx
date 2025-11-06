import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function FeedbackSurvey() {
  const router = useRouter();

  const handleOpenLink = async (linkType) => {
    // Replace these URLs with your actual Google Form/Sheet links
    const links = {
      functional: 'YOUR_FUNCTIONAL_SURVEY_LINK_HERE',
      pssuq: 'YOUR_PSSUQ_SURVEY_LINK_HERE',
      bugReport: 'YOUR_BUG_REPORT_GOOGLE_FORM_LINK_HERE',
      recommendation: 'YOUR_RECOMMENDATION_GOOGLE_FORM_LINK_HERE'
    };

    const url = links[linkType];

    try {
      if (Platform.OS === 'web') {
        // For web, open in new tab
        window.open(url, '_blank');
      } else {
        // For mobile, use Linking API
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💬</Text>
          <Text style={styles.headerTitle}>Feedback & Survey</Text>
          <Text style={styles.headerSubtitle}>Help us improve your experience</Text>
        </View>

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
            <View style={styles.surveyIcon}>
              <Text style={styles.surveyIconText}>📊</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>Functional Survey</Text>
              <Text style={styles.surveyDescription}>
                Evaluate the app's features and functionality
              </Text>
            </View>
            <Text style={styles.surveyArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.surveyCard}
            onPress={() => handleOpenLink('pssuq')}
            activeOpacity={0.7}
          >
            <View style={styles.surveyIcon}>
              <Text style={styles.surveyIconText}>⭐</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>PSSUQ Survey</Text>
              <Text style={styles.surveyDescription}>
                Post-Study System Usability Questionnaire
              </Text>
            </View>
            <Text style={styles.surveyArrow}>→</Text>
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
            <View style={[styles.surveyIcon, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.surveyIconText}>🐛</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>Report a Bug</Text>
              <Text style={styles.surveyDescription}>
                Let us know about any issues you've encountered
              </Text>
            </View>
            <Text style={[styles.surveyArrow, { color: '#EF4444' }]}>→</Text>
          </TouchableOpacity>

          {/* Recommendation Card */}
          <TouchableOpacity 
            style={styles.feedbackCard}
            onPress={() => handleOpenLink('recommendation')}
            activeOpacity={0.7}
          >
            <View style={[styles.surveyIcon, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.surveyIconText}>💡</Text>
            </View>
            <View style={styles.surveyInfo}>
              <Text style={styles.surveyTitle}>Share Recommendation</Text>
              <Text style={styles.surveyDescription}>
                Suggest new features or improvements
              </Text>
            </View>
            <Text style={[styles.surveyArrow, { color: '#3B82F6' }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Thank You Note */}
        <View style={styles.thankYouCard}>
          <Text style={styles.thankYouIcon}>💚</Text>
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
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  surveyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  surveyIconText: {
    fontSize: 24,
  },
  surveyInfo: {
    flex: 1,
  },
  surveyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  surveyDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  surveyArrow: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: 'bold',
  },
  thankYouCard: {
    backgroundColor: '#D1FAE5',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  thankYouIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  thankYouText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
  },
});