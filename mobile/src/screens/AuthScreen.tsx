import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { api, setAuthToken } from "../api/client";
import { authTokenKey } from "../auth/storage";
import { Screen } from "../components/Screen";
import { useAppStore } from "../store/useAppStore";
import { colors, radii, spacing, text } from "../theme";

type AuthMode = "login" | "register";

export const AuthScreen = () => {
	const signIn = useAppStore((state) => state.signIn);
	const [mode, setMode] = useState<AuthMode>("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const isRegister = mode === "register";
	const normalizedEmail = email.trim().toLowerCase();

	const mutation = useMutation({
		mutationFn: () =>
			isRegister
				? api.register({ name: name.trim(), username: normalizedEmail, password })
				: api.login({ username: normalizedEmail, password }),
		onSuccess: async ({ token, user }) => {
			setAuthToken(token);
			await AsyncStorage.setItem(authTokenKey, token);
			signIn(user);
		},
		onError: (error) => {
			Alert.alert(
				isRegister ? "Could not register" : "Could not log in",
				error instanceof Error ? error.message : "Try again.",
			);
		},
	});

	const submit = () => {
		if (isRegister && name.trim().length < 2) {
			Alert.alert("Name needed", "Enter your name.");
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			Alert.alert("Email needed", "Enter a valid email address.");
			return;
		}

		if (password.length < (isRegister ? 8 : 1)) {
			Alert.alert(
				"Password needed",
				isRegister ? "Use at least 8 characters." : "Enter your password.",
			);
			return;
		}

		if (isRegister && password !== confirmPassword) {
			Alert.alert("Passwords do not match", "Enter the same password twice.");
			return;
		}

		mutation.mutate();
	};

	return (
		<Screen>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.keyboard}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="none"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.brandIcon}>
						<Ionicons name="wallet" size={30} color={colors.surface} />
					</View>
					<Text style={styles.title}>Budgeting</Text>
					<Text style={styles.subtitle}>
						Sign in to keep your transactions, categories, and recurring payments private.
					</Text>

					<View style={styles.segment}>
						{(["login", "register"] as AuthMode[]).map((item) => {
							const active = item === mode;
							return (
								<Pressable
									key={item}
									onPress={() => setMode(item)}
									style={[styles.segmentButton, active && styles.segmentButtonActive]}
								>
									<Text style={[styles.segmentText, active && styles.segmentTextActive]}>
										{item === "login" ? "Login" : "Register"}
									</Text>
								</Pressable>
							);
						})}
					</View>

					{isRegister ? (
						<>
							<Text style={styles.label}>Name</Text>
							<TextInput
								value={name}
								onChangeText={setName}
								placeholder="Your name"
								autoCapitalize="words"
								style={styles.input}
								placeholderTextColor={colors.muted}
							/>
						</>
					) : null}

					<Text style={styles.label}>Email</Text>
					<TextInput
						value={email}
						onChangeText={setEmail}
						placeholder="you@example.com"
						keyboardType="email-address"
						textContentType="emailAddress"
						autoComplete="email"
						autoCapitalize="none"
						autoCorrect={false}
						style={styles.input}
						placeholderTextColor={colors.muted}
					/>

					<Text style={styles.label}>Password</Text>
					<View style={styles.inputWrap}>
						<TextInput
							value={password}
							onChangeText={setPassword}
							placeholder={isRegister ? "At least 8 characters" : "Your password"}
							secureTextEntry={!showPassword}
							style={[styles.input, styles.inputWithIcon]}
							placeholderTextColor={colors.muted}
						/>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={showPassword ? "Hide password" : "Show password"}
							onPress={() => setShowPassword((current) => !current)}
							style={styles.passwordToggle}
						>
							<Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.muted} />
						</Pressable>
					</View>

					{isRegister ? (
						<>
							<Text style={styles.label}>Confirm password</Text>
							<View style={styles.inputWrap}>
								<TextInput
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									placeholder="Repeat your password"
									secureTextEntry={!showPassword}
									style={[styles.input, styles.inputWithIcon]}
									placeholderTextColor={colors.muted}
								/>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={showPassword ? "Hide password" : "Show password"}
									onPress={() => setShowPassword((current) => !current)}
									style={styles.passwordToggle}
								>
									<Ionicons
										name={showPassword ? "eye-off" : "eye"}
										size={20}
										color={colors.muted}
									/>
								</Pressable>
							</View>
						</>
					) : null}

					<Pressable
						accessibilityRole="button"
						onPress={submit}
						disabled={mutation.isPending}
						style={({ pressed }) => [
							styles.submit,
							{ opacity: pressed || mutation.isPending ? 0.72 : 1 },
						]}
					>
						{mutation.isPending ? (
							<ActivityIndicator color={colors.surface} />
						) : (
							<>
								<Ionicons
									name={isRegister ? "person-add" : "log-in"}
									size={20}
									color={colors.surface}
								/>
								<Text style={styles.submitText}>{isRegister ? "Create account" : "Login"}</Text>
							</>
						)}
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>
		</Screen>
	);
};

const styles = StyleSheet.create({
	keyboard: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		justifyContent: "center",
		padding: spacing.lg,
		paddingBottom: spacing.xxl * 2,
		gap: spacing.md,
	},
	brandIcon: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.primary,
		marginBottom: spacing.sm,
	},
	title: {
		...text.title,
		fontSize: 34,
	},
	subtitle: {
		...text.muted,
		lineHeight: 21,
		marginBottom: spacing.lg,
	},
	segment: {
		flexDirection: "row",
		padding: spacing.xs,
		borderRadius: radii.md,
		backgroundColor: colors.surfaceAlt,
		gap: spacing.xs,
	},
	segmentButton: {
		flex: 1,
		minHeight: 44,
		borderRadius: radii.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	segmentButtonActive: {
		backgroundColor: colors.surface,
	},
	segmentText: {
		...text.body,
		color: colors.muted,
		fontWeight: "900",
	},
	segmentTextActive: {
		color: colors.ink,
	},
	label: {
		...text.muted,
		fontWeight: "800",
	},
	input: {
		minHeight: 52,
		borderRadius: radii.md,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: spacing.lg,
		color: colors.ink,
		fontSize: 16,
		fontWeight: "700",
	},
	inputWrap: {
		position: "relative",
	},
	inputWithIcon: {
		paddingRight: 52,
	},
	passwordToggle: {
		position: "absolute",
		right: 6,
		top: 5,
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	submit: {
		minHeight: 54,
		borderRadius: radii.md,
		backgroundColor: colors.primary,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: spacing.sm,
		marginTop: spacing.md,
	},
	submitText: {
		color: colors.surface,
		fontSize: 16,
		fontWeight: "900",
	},
});
