// app/(auth)/success.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function AuthSuccess() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { handleOAuthSuccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processAuthCallback();
  }, []);

  const processAuthCallback = async () => {
    try {
      console.log('🔄 Processing auth callback with params:', params);
      
      // Extract token from various possible parameter names
      const token = params.token || params.access_token || params.code;
      
      if (!token) {
        throw new Error('No authentication token found in callback');
      }

      console.log('✅ Token found, processing...');
      await handleOAuthSuccess(token as string);
      
    } catch (error: any) {
      console.error('❌ Auth callback error:', error);
      setError(error.message);
      
      // Redirect to login after error
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>Completing authentication...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
          Authentication Failed
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#666' }}>
          {error}
        </Text>
        <Text style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
          Redirecting to login...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16 }}>Authentication successful! Redirecting...</Text>
    </View>
  );
}