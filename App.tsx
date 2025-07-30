import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  StyleSheet,
  useColorScheme,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens from src folder
import CreateTransactionScreen from './src/screens/CreateTransactionScreen';
import TransactionListScreen from './src/screens/TransactionListScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';

// Navigation types
export type RootTabParamList = {
  CreateTransaction: undefined;
  TransactionList: undefined;
};

export type RootStackParamList = {
  MainTabs: {
    screen?: keyof RootTabParamList;
  } | undefined;
  EditTransaction: {
    transactionId: number;
  };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Main Tab Navigator
function MainTabNavigator(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({
        route,
      }: {
        route: { key: string; name: keyof RootTabParamList };
      }) => ({
        headerShown: false,
        tabBarIcon: ({
          focused,
          color,
          size,
        }: {
          focused: boolean;
          color: string;
          size: number;
        }) => {
          let iconName: string;

          if (route.name === 'CreateTransaction') {
            iconName = 'add-circle';
          } else if (route.name === 'TransactionList') {
            iconName = 'list';
          } else {
            iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: isDarkMode ? '#999' : '#666',
        tabBarStyle: [
          styles.tabBar,
          isDarkMode && styles.darkTabBar,
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="CreateTransaction"
        component={CreateTransactionScreen}
        options={{
          tabBarLabel: 'Buat Transaksi',
        }}
      />
      <Tab.Screen
        name="TransactionList"
        component={TransactionListScreen}
        options={{
          tabBarLabel: 'Daftar Transaksi',
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Component with Stack Navigator
function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EditTransaction"
          component={EditTransactionScreen}
          options={{
            headerShown: false,
            presentation: 'modal', // Optional: makes it feel like a modal
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    height: 65,
  },
  darkTabBar: {
    backgroundColor: '#1e1e1e',
    borderTopColor: '#333',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
});

export default App;