import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import axios from 'axios';

const API_BASE_URL = 'https://hemolens-project-0pyv.onrender.com';
const CAPTURE_INTERVAL = 1500; // Capture every 1.5 seconds
const MAX_HISTORY = 5; // Keep last 5 predictions for rolling average

export default function RealtimeCamera({ onClose }) {
  const cameraRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [averageHemoglobin, setAverageHemoglobin] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const captureIntervalRef = useRef(null);
  const [permission, setPermission] = useState(null);

  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await CameraView.requestCameraPermissionsAsync();
      setPermission(status === 'granted');
    })();
  }, []);

  // Start periodic frame capture
  useEffect(() => {
    if (isCameraReady && permission) {
      captureIntervalRef.current = setInterval(captureFrame, CAPTURE_INTERVAL);
      return () => clearInterval(captureIntervalRef.current);
    }
  }, [isCameraReady, permission]);

  // Update rolling average when predictions change
  useEffect(() => {
    if (predictions.length > 0) {
      const average =
        predictions.reduce((sum, p) => sum + p.hemoglobin, 0) / predictions.length;
      setAverageHemoglobin(average);
    }
  }, [predictions]);

  const captureFrame = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });

      if (photo) {
        setFrameCount((prev) => prev + 1);
        await sendFrameForPrediction(photo);
      }
    } catch (error) {
      console.log('Capture error:', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendFrameForPrediction = async (photo) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `frame_${frameCount}.jpg`,
      });

      const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.data && response.data.hemoglobin_estimate !== undefined) {
        const newPrediction = {
          hemoglobin: response.data.hemoglobin_estimate,
          timestamp: new Date().toLocaleTimeString(),
          confidence: response.data.confidence || 0.5,
        };

        setPredictions((prev) => {
          const updated = [newPrediction, ...prev];
          return updated.slice(0, MAX_HISTORY);
        });
      }
    } catch (error) {
      console.log('Prediction error:', error.message);
    }
  };

  const handleStop = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    onClose();
  };

  if (permission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.centerText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (permission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.centerText}>Camera permission denied</Text>
        <TouchableOpacity
          style={[styles.button, styles.closeButton]}
          onPress={handleStop}
        >
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onCameraReady={() => setIsCameraReady(true)}
        facing="front"
      />

      {/* Overlay with guidance and results */}
      <View style={styles.overlay}>
        {/* Top header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Real-time Detection</Text>
          <Text style={styles.headerSubtitle}>Hold camera near eye</Text>
        </View>

        {/* Center guidance circle */}
        <View style={styles.centerElement}>
          <View style={styles.guidanceCircle} />
          <Text style={styles.guidanceText}>Focus on palpebral conjunctiva</Text>
        </View>

        {/* Bottom results */}
        <View style={styles.resultsContainer}>
          <View style={styles.resultCard}>
            {averageHemoglobin !== null ? (
              <>
                <Text style={styles.resultLabel}>Hemoglobin Level</Text>
                <Text style={styles.resultValue}>
                  {averageHemoglobin.toFixed(2)} g/dL
                </Text>
                <Text style={styles.dataPointsText}>
                  ({predictions.length} measurements)
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.resultLabel}>Initializing...</Text>
                <ActivityIndicator size="large" color="#4CAF50" />
              </>
            )}
          </View>

          {isProcessing && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.processingText}>Processing frame...</Text>
            </View>
          )}

          {/* Frame counter */}
          <Text style={styles.frameCounter}>Frames: {frameCount}</Text>
        </View>

        {/* Recent predictions list */}
        {predictions.length > 0 && (
          <View style={styles.predictionsPanel}>
            <Text style={styles.panelTitle}>Recent Measurements</Text>
            {predictions.slice(0, 3).map((pred, idx) => (
              <View key={idx} style={styles.predictionRow}>
                <Text style={styles.predictionTime}>{pred.timestamp}</Text>
                <Text style={styles.predictionValue}>
                  {pred.hemoglobin.toFixed(2)} g/dL
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.closeButton]}
          onPress={handleStop}
        >
          <Text style={styles.buttonText}>Stop & Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  header: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#AAA',
  },
  centerElement: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4CAF50',
    opacity: 0.6,
    marginBottom: 12,
  },
  guidanceText: {
    color: '#FFF',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  resultsContainer: {
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: '80%',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  dataPointsText: {
    fontSize: 10,
    color: '#FFF',
    opacity: 0.6,
    marginTop: 4,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  processingText: {
    color: '#FFF',
    fontSize: 11,
    marginLeft: 8,
  },
  frameCounter: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 8,
  },
  predictionsPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  panelTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  predictionTime: {
    color: '#AAA',
    fontSize: 10,
  },
  predictionValue: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: 'bold',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    backgroundColor: '#FF5252',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  centerText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  },
});
