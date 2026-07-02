import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { BudgetsScreen } from "../screens/BudgetsScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import { colors } from "../theme";

export type RootTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Analytics: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const icons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "home",
  Transactions: "receipt",
  Budgets: "speedometer",
  Analytics: "bar-chart",
  Settings: "settings"
};

export const BottomTabs = () => (
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
        height: 72,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: colors.surface,
        borderTopColor: colors.border
      },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Home" }} />
    <Tab.Screen name="Transactions" component={TransactionsScreen} />
    <Tab.Screen name="Budgets" component={BudgetsScreen} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

