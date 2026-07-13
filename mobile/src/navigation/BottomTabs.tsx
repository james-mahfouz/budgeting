import Ionicons from "react-native-vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { LoansScreen } from "../screens/LoansScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import { useAppTheme } from "../theme";

export type RootTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Loans: undefined;
  Analytics: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const icons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "home",
  Transactions: "receipt",
  Loans: "swap-horizontal",
  Analytics: "bar-chart",
  Settings: "settings"
};

export const BottomTabs = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800"
        },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Loans" component={LoansScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};
