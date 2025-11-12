import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router'; // Add this import at the top


export default function AppInfoPage() {
  const [checking, setChecking] = useState(false);
  const [isWebBrowser, setIsWebBrowser] = useState(false);
  
  // Replace with your actual links
  const LATEST_APK_LINK = 'https://drive.google.com/drive/folders/1-Af0OSQ9hRLJGqkosd5VDn6PpCaAV2Lb?usp=sharing';
  const APP_VERSION = '1.0.5';
  const LATEST_VERSION = '1.0.5';
  const RELEASE_DATE = 'November 10, 2025';
  
   const handleBack = () => {
    router.back(); // or router.push('/home') depending on your navigation
  };


  useEffect(() => {
    // Detect if running in web browser vs native app
    const detectEnvironment = () => {
      const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';
      setIsWebBrowser(isWeb);
    };
    
    detectEnvironment();
  }, []);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (APP_VERSION === LATEST_VERSION) {
        Alert.alert('Up to Date', 'You have the latest version installed!');
      } else {
        Alert.alert(
          'Update Available',
          `Version ${LATEST_VERSION} is available. Would you like to download?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Download', onPress: () => Linking.openURL(LATEST_APK_LINK) }
          ]
        );
      }
    }, 1500);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: `Check out this amazing app! Download here: ${LATEST_APK_LINK}`,
        title: 'Share App',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownloadAPK = () => {
    Linking.openURL(LATEST_APK_LINK);
  };

  // Render for WEB BROWSER users
  if (isWebBrowser) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Hero Section for Web Users */}
         {/* ADD THIS BACK BUTTON */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#1E3A8A" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Download App</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.webHero}>
          <View style={styles.webHeroIcon}>
            <Ionicons name="phone-portrait" size={80} color="#1f4b81" />
            <View style={styles.downloadBadge}>
              <Ionicons name="download" size={20} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.webHeroTitle}>Experience More with Our App!</Text>
          <Text style={styles.webHeroSubtitle}>
            Get exclusive features, faster performance, and offline access
          </Text>
        </View>

        {/* Exclusive Features Comparison */}
        <View style={styles.comparisonContainer}>
          <Text style={styles.sectionTitle}>Why Download the App?</Text>
          
          <View style={styles.featureComparison}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonLabel}>Feature</Text>
              <View style={styles.comparisonColumns}>
                <Text style={styles.comparisonColumnWeb}>Web</Text>
                <Text style={styles.comparisonColumnApp}>App</Text>
              </View>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>⚡ Loading Speed</Text>
              <View style={styles.comparisonColumns}>
                <View style={styles.comparisonCell}>
                  <Text style={styles.comparisonValue}>Good</Text>
                </View>
                <View style={[styles.comparisonCell, styles.highlightCell]}>
                  <Ionicons name="flash" size={16} color="#1f4b81" />
                  <Text style={styles.comparisonValueApp}>Lightning</Text>
                </View>
              </View>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>📱 Push Notifications</Text>
              <View style={styles.comparisonColumns}>
                <View style={styles.comparisonCell}>
                  <Ionicons name="close" size={18} color="#EF4444" />
                </View>
                <View style={[styles.comparisonCell, styles.highlightCell]}>
                  <Ionicons name="checkmark" size={18} color="#1f4b81" />
                </View>
              </View>
            </View>


            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>🎯 Native Experience</Text>
              <View style={styles.comparisonColumns}>
                <View style={styles.comparisonCell}>
                  <Ionicons name="close" size={18} color="#EF4444" />
                </View>
                <View style={[styles.comparisonCell, styles.highlightCell]}>
                  <Ionicons name="checkmark" size={18} color="#1f4b81" />
                </View>
              </View>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.featureName}>💾 Data Usage</Text>
              <View style={styles.comparisonColumns}>
                <View style={styles.comparisonCell}>
                  <Text style={styles.comparisonValue}>High</Text>
                </View>
                <View style={[styles.comparisonCell, styles.highlightCell]}>
                  <Ionicons name="leaf" size={16} color="#1f4b81" />
                  <Text style={styles.comparisonValueApp}>60% Less</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Exclusive App Features */}
        <View style={styles.exclusiveFeaturesContainer}>
          <Text style={styles.sectionTitle}>🌟 App-Only Features</Text>
          
          <View style={styles.exclusiveFeature}>
            <View style={styles.exclusiveIcon}>
              <Ionicons name="notifications-circle" size={32} color="#1f4b81" />
            </View>
            <View style={styles.exclusiveContent}>
              <Text style={styles.exclusiveTitle}>Real-Time Notifications</Text>
              <Text style={styles.exclusiveDescription}>
                Get instant alerts for important updates, never miss a beat
              </Text>
            </View>
          </View>

          <View style={styles.exclusiveFeature}>
            <View style={styles.exclusiveIcon}>
              <Ionicons name="cloud-offline" size={32} color="#1E3A8A" />
            </View>
            <View style={styles.exclusiveContent}>
              <Text style={styles.exclusiveTitle}>Work Offline</Text>
              <Text style={styles.exclusiveDescription}>
                Access your data anytime, anywhere - no internet required
              </Text>
            </View>
          </View>

          <View style={styles.exclusiveFeature}>
            <View style={styles.exclusiveIcon}>
              <Ionicons name="finger-print" size={32} color="#1f4b81" />
            </View>
            <View style={styles.exclusiveContent}>
              <Text style={styles.exclusiveTitle}>Biometric Security</Text>
              <Text style={styles.exclusiveDescription}>
                Quick and secure login with fingerprint or face unlock
              </Text>
            </View>
          </View>

          <View style={styles.exclusiveFeature}>
            <View style={styles.exclusiveIcon}>
              <Ionicons name="color-wand" size={32} color="#1E40AF" />
            </View>
            <View style={styles.exclusiveContent}>
              <Text style={styles.exclusiveTitle}>Premium Experience</Text>
              <Text style={styles.exclusiveDescription}>
                Smoother animations, faster responses, native feel
              </Text>
            </View>
          </View>
        </View>

        {/* Download CTA */}
        <TouchableOpacity
          style={styles.downloadCTA}
          onPress={handleDownloadAPK}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#1f4b81', '#1E3A8A']}
            style={styles.downloadCTAGradient}
          >
            <View style={styles.downloadCTAContent}>
              <Ionicons name="download" size={28} color="#FFFFFF" />
              <View style={styles.downloadCTAText}>
                <Text style={styles.downloadCTATitle}>Download APK Now</Text>
                <Text style={styles.downloadCTASubtitle}>Free • 25MB • Android 5.0+</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

      

        {/* Installation Guide */}
        <View style={styles.installGuide}>
          <Text style={styles.sectionTitle}>📲 Quick Install Guide</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Tap "Download APK Now" button above</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Allow installation from unknown sources</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Open the downloaded APK and install</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Enjoy the premium experience! 🎉</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Render for NATIVE APP users (existing content)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* ADD THIS BACK BUTTON */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#1E3A8A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Info</Text>
        <View style={{ width: 50 }} />
      </View>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.appIconContainer}>
          <Ionicons name="checkmark-circle" size={60} color="#1f4b81" />
        </View>
        <Text style={styles.title}>App Installed</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version {APP_VERSION}</Text>
        </View>
        <Text style={styles.releaseDate}>Released: {RELEASE_DATE}</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCheckUpdates}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="refresh" size={24} color="#1f4b81" />
          </View>
          <Text style={styles.actionText}>Check for Updates</Text>
          {checking && <MaterialIcons name="sync" size={20} color="#1f4b81" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShareApp}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="share-social" size={24} color="#1f4b81" />
          </View>
          <Text style={styles.actionText}>Share with Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDownloadAPK}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="cloud-download" size={24} color="#1f4b81" />
          </View>
          <Text style={styles.actionText}>Download Latest APK</Text>
        </TouchableOpacity>
      </View>

      {/* What's New Section */}
      <View style={styles.whatsNewContainer}>
        <Text style={styles.sectionTitle}>What's New in {APP_VERSION}</Text>
        
        <View style={styles.changelogItem}>
          <View style={styles.changelogIcon}>
            <Ionicons name="sparkles" size={18} color="#1f4b81" />
          </View>
          <Text style={styles.changelogText}>
            Improved app performance and stability
          </Text>
        </View>

        <View style={styles.changelogItem}>
          <View style={styles.changelogIcon}>
            <Ionicons name="bug" size={18} color="#1f4b81" />
          </View>
          <Text style={styles.changelogText}>
            Fixed minor bugs and UI issues
          </Text>
        </View>

        <View style={styles.changelogItem}>
          <View style={styles.changelogIcon}>
            <Ionicons name="shield-checkmark" size={18} color="#1f4b81" />
          </View>
          <Text style={styles.changelogText}>
            Enhanced security features
          </Text>
        </View>

        <View style={styles.changelogItem}>
          <View style={styles.changelogIcon}>
            <Ionicons name="color-palette" size={18} color="#1f4b81" />
          </View>
          <Text style={styles.changelogText}>
            New UI improvements and animations
          </Text>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.sectionTitle}>App Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Package Name</Text>
          <Text style={styles.infoValue}>com.yourapp.mobile</Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Size</Text>
          <Text style={styles.infoValue}>25 MB</Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Min Android Version</Text>
          <Text style={styles.infoValue}>5.0 (Lollipop)</Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated</Text>
          <Text style={styles.infoValue}>{RELEASE_DATE}</Text>
        </View>
      </View>

      {/* Help Section */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpDescription}>
          Having issues with the app? Our support team is here to help!
        </Text>
        
        <View style={styles.helpButtons}>
          <TouchableOpacity style={styles.helpButton} activeOpacity={0.7}>
            <FontAwesome5 name="book" size={16} color="#1f4b81" />
            <Text style={styles.helpButtonText}>Documentation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpButton} activeOpacity={0.7}>
            <Ionicons name="chatbubbles" size={16} color="#1f4b81" />
            <Text style={styles.helpButtonText}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Privacy & Terms */}
      <View style={styles.footerLinks}>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.footerDivider}>•</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.footerLink}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // WEB BROWSER STYLES
  webHero: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#E0F2FE',
    borderRadius: 20,
    marginBottom: 32,
  },
  webHeroIcon: {
    position: 'relative',
    marginBottom: 24,
  },
  downloadBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f4b81',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  webHeroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  webHeroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  comparisonContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  featureComparison: {
    marginTop: 16,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    flex: 1,
  },
  comparisonColumns: {
    flexDirection: 'row',
    width: 140,
  },
  comparisonColumnWeb: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    width: 70,
    textAlign: 'center',
  },
  comparisonColumnApp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f4b81',
    width: 70,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureName: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  comparisonCell: {
    width: 70,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  highlightCell: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 4,
    borderRadius: 6,
  },
  comparisonValue: {
    fontSize: 13,
    color: '#6B7280',
  },
  comparisonValueApp: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f4b81',
  },
  exclusiveFeaturesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  exclusiveFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  exclusiveIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exclusiveContent: {
    flex: 1,
  },
  exclusiveTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  exclusiveDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  downloadCTA: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#1f4b81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  downloadCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  downloadCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  downloadCTAText: {
    marginLeft: 16,
    flex: 1,
  },
  downloadCTATitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  downloadCTASubtitle: {
    fontSize: 13,
    color: '#DBEAFE',
  },
  socialProof: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f4b81',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  installGuide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f4b81',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    paddingTop: 6,
  },

  // NATIVE APP STYLES
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  appIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1f4b81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  versionBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f4b81',
  },
  releaseDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  whatsNewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  changelogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  changelogIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  changelogText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    paddingTop: 3,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  helpContainer: {
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  helpDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  helpButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f4b81',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerLink: {
    fontSize: 13,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  footerDivider: {
    fontSize: 13,
    color: '#6B7280',
    marginHorizontal: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
});