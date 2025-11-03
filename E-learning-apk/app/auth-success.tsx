// app/auth-success.tsx
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function AuthSuccessScreen() {
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const { handleOAuthSuccess } = useAuth();

  useEffect(() => {
    const processOAuthToken = async () => {
      try {
        console.log('Processing OAuth token:', token);
        
        if (token && typeof token === 'string') {
          await handleOAuthSuccess(token);
          // Navigation happens in handleOAuthSuccess
        } else {
          throw new Error('No valid token received');
        }
      } catch (error: any) {
        console.error('OAuth processing error:', error);
        Alert.alert(
          'Authentication Failed', 
          error.message || 'Unable to complete authentication. Please try again.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      } finally {
        setLoading(false);
      }
    };

    processOAuthToken();
  }, [token]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4299E1" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Completing authentication...
        </Text>
      </View>
    );
  }

  return null;
}