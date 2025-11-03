import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Animated, Easing, TouchableOpacity } from "react-native";

// Animated Tab Icon Component
const AnimatedTabIcon = ({ name, library: IconLibrary, color, size, focused }) => {
  const scaleAnim = new Animated.Value(1);
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    }
  }, [focused]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [
          { scale: scaleAnim },
          { rotate: rotateInterpolate }
        ],
      }}
    >
      <IconLibrary name={name} size={size} color={color} />
    </Animated.View>
  );
};

// Floating Action Button Component
const FloatingTabBar = ({ state, descriptors, navigation }) => {
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        marginBottom: 25,
        borderRadius: 25,
        height: 70,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconProps = {
          color: isFocused ? '#6366F1' : '#9CA3AF',
          size: 24,
          focused: isFocused,
        };

        let iconComponent;
        switch (route.name) {
          case 'index':
            iconComponent = <AnimatedTabIcon library={Ionicons} name="home-outline" {...iconProps} />;
            break;
          case 'MyCourses':
            iconComponent = <AnimatedTabIcon library={Ionicons} name="library-outline" {...iconProps} />;
            break;
          case 'Progress':
            iconComponent = <AnimatedTabIcon library={MaterialIcons} name="analytics" {...iconProps} />;
            break;
          case 'profile':
            iconComponent = <AnimatedTabIcon library={Ionicons} name="person-outline" {...iconProps} />;
            break;
          default:
            iconComponent = <Ionicons name="square" {...iconProps} />;
        }

        return (
          <Animated.View
            key={route.name}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: isFocused ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              }}
            >
              {iconComponent}
              <Animated.Text
                style={{
                  color: isFocused ? '#6366F1' : '#9CA3AF',
                  fontSize: 10,
                  fontWeight: isFocused ? '700' : '500',
                  marginTop: 4,
                  opacity: isFocused ? 1 : 0.8,
                }}
              >
                {label}
              </Animated.Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
};

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none', // Hide default tab bar
        },
      }}
      tabBar={props => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen 
        name="index"
        options={{
          title: 'Home',
        }}
      />

      <Tabs.Screen 
        name="MyCourses"
        options={{
          title: 'Courses',
        }}
      />

      <Tabs.Screen 
        name="Progress"
        options={{
          title: 'Progress',
        }}
      />

      <Tabs.Screen 
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}