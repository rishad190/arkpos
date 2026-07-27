"use client";
import { createContext, useContext, useEffect, useReducer, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";

// Initial settings state
const INITIAL_SETTINGS = {
  store: {
    name: "ARK POS",
    address: "",
    phone: "",
    email: "",
    currency: "BDT",
    vatRate: 0,
  },
  invoice: {
    header: "",
    footer: "Thank you for your business!",
    showLogo: true,
    paperSize: "A4",
  },
  notifications: {
    lowStockWarning: true,
    paymentDueReminder: true,
    dailyReport: false,
    emailNotifications: false,
  },
  appearance: {
    theme: "light",
    compactMode: false,
    showImages: true,
  },
  security: {
    requirePassword: false,
    sessionTimeout: 30,
    backupEnabled: true,
  },
  permissions: {
    dashboard: true,
    customers: true,
    cashbook: false,
    inventory: true,
    cashmemo: true,
    suppliers: false,
    inventoryProfit: false,
    partners: false,
    loans: false,
    products: false,
    expenseReport: false,
    settings: false,
  },
};

const SettingsContext = createContext(null);

function settingsReducer(state, action) {
  switch (action.type) {
    case "UPDATE_SETTINGS":
      return {
        ...state,
        ...action.payload,
      };
    case "UPDATE_SECTION":
      return {
        ...state,
        [action.section]: {
          ...state[action.section],
          ...action.payload,
        },
      };
    case "RESET_SETTINGS":
      return INITIAL_SETTINGS;
    default:
      return state;
  }
}

export function SettingsProvider({ children }) {
  const [settings, dispatch] = useReducer(settingsReducer, INITIAL_SETTINGS);
  const [storeBalance, setStoreBalance] = useState({ cash: 0, bank: 0 });
  const { toast } = useToast();

  // Subscribe to store balance from Firebase
  useEffect(() => {
    if (!db) {
      setStoreBalance({ cash: 0, bank: 0 });
      return;
    }
    const balanceRef = ref(db, "settings/store/balance");
    const unsubscribe = onValue(balanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStoreBalance(data);
      } else {
        // Initialize with zeros if path doesn't exist
        setStoreBalance({ cash: 0, bank: 0 });
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to settings config from Firebase
  useEffect(() => {
    if (!db) return;
    const settingsRef = ref(db, "settings/config");
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        dispatch({ type: "UPDATE_SETTINGS", payload: data });
      } else {
        // Seed database with initial settings if empty
        set(settingsRef, INITIAL_SETTINGS).catch((error) => {
          console.error("Failed to seed initial settings to Firebase:", error);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("ark_pos_settings");
      if (savedSettings) {
        dispatch({ type: "UPDATE_SETTINGS", payload: JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("ark_pos_settings", JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  // Apply theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (settings.appearance.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.appearance.theme);
    }
  }, [settings.appearance.theme]);

  const updateSettings = useCallback(async (newSettings) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: newSettings });
    if (db) {
      try {
        const updated = {
          ...settings,
          ...newSettings,
        };
        await set(ref(db, "settings/config"), updated);
      } catch (error) {
        console.error("Failed to sync settings to Firebase:", error);
      }
    }
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved.",
    });
  }, [settings, toast]);

  const updateSection = useCallback(async (section, data) => {
    dispatch({ type: "UPDATE_SECTION", section, payload: data });
    if (db) {
      try {
        const updatedSection = {
          ...(settings[section] || {}),
          ...data,
        };
        await set(ref(db, `settings/config/${section}`), updatedSection);
      } catch (error) {
        console.error("Failed to sync settings section to Firebase:", error);
      }
    }
    toast({
      title: "Settings Updated",
      description: `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved.`,
    });
  }, [settings, toast]);

  const resetSettings = useCallback(async () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      dispatch({ type: "RESET_SETTINGS" });
      if (db) {
        try {
          await set(ref(db, "settings/config"), INITIAL_SETTINGS);
        } catch (error) {
          console.error("Failed to reset settings in Firebase:", error);
        }
      }
      toast({
        title: "Settings Reset",
        description: "All settings have been restored to defaults.",
      });
    }
  }, [toast]);

  const value = {
    settings,
    storeBalance,
    updateSettings,
    updateSection,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
