// components/CustomAlert.tsx
import React from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  text: string;
  onPress: () => void;
  style?: 'primary' | 'secondary';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: ButtonProps[];
}

export default function CustomAlert({ visible, title, message, buttons }: CustomAlertProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Ionicons name="checkmark-circle" size={48} color="#22c55e" style={{ marginBottom: 15 }} />
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>{message}</Text>

          <View style={styles.buttonContainer}>
            {buttons.map((buttonInfo, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  buttonInfo.style === 'primary' ? styles.buttonPrimary : styles.buttonSecondary
                ]}
                onPress={buttonInfo.onPress}
              >
                <Text 
                  style={[
                    styles.textStyle,
                    buttonInfo.style === 'primary' ? styles.textPrimary : styles.textSecondary
                  ]}
                >
                  {buttonInfo.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    width: '100%',
    marginTop: 10,
  },
  buttonPrimary: {
    backgroundColor: '#1a2b47',
  },
  buttonSecondary: {
    backgroundColor: '#f0f2f5',
  },
  textStyle: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  textPrimary: {
    color: 'white',
  },
  textSecondary: {
    color: '#1a2b47',
  },
});