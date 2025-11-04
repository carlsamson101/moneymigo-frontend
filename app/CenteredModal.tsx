import React, { ReactNode } from 'react';
import { Modal, View, StyleSheet } from 'react-native';

type CenteredModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function CenteredModal({ visible, onClose, children }: CenteredModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.19)',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    minWidth: 260,
    maxWidth: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});
