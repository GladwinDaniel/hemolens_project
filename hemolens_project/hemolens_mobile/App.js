import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import RealtimeCamera from './RealtimeCamera';

const API_BASE_URL = 'https://hemolens-project-0pyv.onrender.com';

export default function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiStatus, setApiStatus] = useState('unknown');
  const [useRealtimeMode, setUseRealtimeMode] = useState(false);

  // Check API status on app start
  React.useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 10000,
      });
      setApiStatus(response.data.status === 'ok' ? 'connected' : 'error');
    } catch (error) {
      setApiStatus('disconnected');
      console.log('API Health Check:', error.message);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0]);
        setResult(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0]);
        setResult(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image: ' + error.message);
    }
  };

  const predictHemoglobin = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: image.uri,
        type: 'image/jpeg',
        name: image.filename || 'photo.jpg',
      });

      const response = await axios.post(
        `${API_BASE_URL}/predict`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        }
      );

      setResult({
        hemoglobin: response.data.hemoglobin_estimate,
        unit: response.data.unit,
        model: response.data.model_used,
        status: response.data.status,
        confidence: response.data.confidence,
        processingTime: response.data.processing_time_ms,
      });

      setApiStatus('connected');
    } catch (error) {
      setApiStatus('error');
      console.error('Prediction error:', error);
      Alert.alert(
        'Prediction Error',
        `Failed to get prediction: ${error.message || 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Show realtime camera if toggled
  if (useRealtimeMode) {
    return (
      <RealtimeCamera onClose={() => setUseRealtimeMode(false)} />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🩸 HemoLens</Text>
        <Text style={styles.subtitle}>Hemoglobin Estimation</Text>
        
        {/* API Status Indicator */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  apiStatus === 'connected'
                    ? '#4CAF50'
                    : apiStatus === 'disconnected'
                    ? '#FF5252'
                    : '#FFC107',
              },
            ]}
          />
          <Text style={styles.statusText}>
            {apiStatus === 'connected'
              ? 'Connected'
              : apiStatus === 'disconnected'
              ? 'Disconnected'
              : 'Checking...'}
          </Text>
        </View>
      </View>

      {/* Image Preview */}
      {image && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: image.uri }}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.imageInfo}>
            {Math.round(image.fileSize / 1024)} KB
          </Text>
        </View>
      )}

      {!image && (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>📷 Select an image</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.cameraButton]}
          onPress={pickImageFromCamera}
        >
          <Text style={styles.buttonText}>📸 Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.galleryButton]}
          onPress={pickImageFromGallery}
        >
          <Text style={styles.buttonText}>🖼️ Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Real-time Mode Button */}
      <TouchableOpacity
        style={[styles.button, styles.realtimeButton]}
        onPress={() => setUseRealtimeMode(true)}
      >
        <Text style={styles.buttonText}>🎥 Real-time Detection</Text>
      </TouchableOpacity>

      {/* Predict Button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.predictButton,
          !image || loading ? styles.buttonDisabled : null,
        ]}
        onPress={predictHemoglobin}
        disabled={!image || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="large" />
        ) : (
          <Text style={styles.buttonText}>🧬 Predict Hemoglobin</Text>
        )}
      </TouchableOpacity>

      {/* Result Display */}
      {result && (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>✅ Prediction Result</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Hemoglobin:</Text>
            <Text style={styles.resultValue}>
              {result.hemoglobin.toFixed(2)} {result.unit}
            </Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Model Used:</Text>
            <Text style={styles.resultValue}>{result.model}</Text>
          </View>

          {result.confidence && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Confidence:</Text>
              <Text style={styles.resultValue}>
                {(result.confidence * 100).toFixed(1)}%
              </Text>
            </View>
          )}

          {result.processingTime && (
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Processing Time:</Text>
              <Text style={styles.resultValue}>{result.processingTime}ms</Text>
            </View>
          )}

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Status:</Text>
            <Text style={styles.resultValue}>{result.status}</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>HemoLens Mobile v1.0</Text>
        <Text style={styles.footerSmall}>Powered by AI-ML</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#d32f2f',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  imageContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 10,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  imageInfo: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
  placeholderContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  placeholderText: {
    fontSize: 18,
    color: '#999',
  },
  buttonGroup: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#2196F3',
  },
  galleryButton: {
    flex: 1,
    backgroundColor: '#FF9800',
  },
  realtimeButton: {
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: '#9C27B0',
    paddingVertical: 14,
    height: 50,
    justifyContent: 'center',
  },
  predictButton: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#4CAF50',
    height: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  resultContainer: {
    backgroundColor: '#e8f5e9',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  resultHeader: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7d32',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  footer: {
    marginTop: 40,
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  footerSmall: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
