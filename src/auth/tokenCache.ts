import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { type TokenCache } from '@clerk/clerk-expo';

const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        const item = await SecureStore.getItemAsync(key);
        return item;
      } catch (error) {
        console.error('SecureStore getToken error:', error);
        await SecureStore.deleteItemAsync(key);
        return null;
      }
    },
    saveToken: async (key: string, token: string) => {
      try {
        await SecureStore.setItemAsync(key, token);
      } catch (error) {
        console.error('SecureStore saveToken error:', error);
      }
    },
    clearToken: async (key: string) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('SecureStore clearToken error:', error);
      }
    },
  };
};

// SecureStore is not available on web, so we need a fallback
const createWebTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    saveToken: async (key: string, token: string) => {
      try {
        localStorage.setItem(key, token);
      } catch {
        // Ignore
      }
    },
    clearToken: async (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    },
  };
};

export const tokenCache = Platform.OS === 'web' ? createWebTokenCache() : createTokenCache();
