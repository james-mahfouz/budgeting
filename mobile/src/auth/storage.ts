import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "../types";

export const authTokenKey = "budgeting.authToken";
export const authUserKey = "budgeting.authUser";
export const themePreferenceKey = "budgeting.themePreference";

export type StoredAuthSession = {
  token: string;
  user: User | null;
};

const parseStoredUser = (value: string | null): User | null => {
  if (!value) {
    return null;
  }

  try {
    const user = JSON.parse(value) as Partial<User>;
    if (typeof user.id === "string" && typeof user.name === "string" && typeof user.username === "string") {
      return { id: user.id, name: user.name, username: user.username };
    }
  } catch {
    // A token saved by an older app version can still be migrated online.
  }

  return null;
};

export const loadStoredAuthSession = async (): Promise<StoredAuthSession | null> => {
  const values = await AsyncStorage.multiGet([authTokenKey, authUserKey]);
  const token = values[0]?.[1];
  if (!token) {
    return null;
  }

  return { token, user: parseStoredUser(values[1]?.[1] ?? null) };
};

export const saveStoredAuthSession = (token: string, user: User) =>
  AsyncStorage.multiSet([
    [authTokenKey, token],
    [authUserKey, JSON.stringify(user)]
  ]);

export const clearStoredAuthSession = () => AsyncStorage.multiRemove([authTokenKey, authUserKey]);
