import { Ionicons } from '@expo/vector-icons';
import { Tabs } from "expo-router";
import { SafeAreaView } from 'react-native';

export default function AdminLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            backgroundColor: '#ffffff',
            borderTopColor: '#e0e0e0',
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen 
          name="index" 
          options={{ 
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />
          }} 
        />
        <Tabs.Screen 
          name="totalAdmin" 
          options={{ 
            tabBarLabel: 'Admins',
            tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} />
          }} 
        />
        <Tabs.Screen 
          name="totalStudent" 
          options={{ 
            tabBarLabel: 'Students',
            tabBarIcon: ({ color }) => <Ionicons name="school-outline" size={24} color={color} />
          }} 
        />
          <Tabs.Screen 
          name="profile" 
          options={{ 
            tabBarLabel: 'Students',
            tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />
          }} 
        />
      </Tabs>
    </SafeAreaView>
  );
}
