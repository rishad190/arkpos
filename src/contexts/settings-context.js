"use client";
import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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

  const updateSettings = useCallback((newSettings) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: newSettings });
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved.",
    });
  }, [toast]);

  const updateSection = useCallback((section, data) => {
    dispatch({ type: "UPDATE_SECTION", section, payload: data });
    toast({
      title: "Settings Updated",
      description: `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved.`,
    });
  }, [toast]);

  const resetSettings = useCallback(() => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      dispatch({ type: "RESET_SETTINGS" });
      toast({
        title: "Settings Reset",
        description: "All settings have been restored to defaults.",
      });
    }
  }, [toast]);

  const value = {
    settings,
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
