import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AvoLanguage } from "@/types/schemas/api/avoHelper";

const AVO_LANGUAGE_KEY = "avo_language";

interface SettingsContextType {
  notif: boolean;
  getSettings: (notif: boolean) => void;
  avoLanguage: AvoLanguage;
  setAvoLanguage: (lang: AvoLanguage) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  notif: true,
  getSettings: (notif: boolean) => {},
  avoLanguage: "pl",
  setAvoLanguage: (lang: AvoLanguage) => {},
});

interface SettingsContextProviderProps {
  children: ReactNode;
}

function SettingsContextProvider({ children }: SettingsContextProviderProps): React.JSX.Element {
  const [notif, setNotif] = useState<boolean>(true);
  const [avoLanguage, setAvoLanguageState] = useState<AvoLanguage>("pl");

  useEffect(() => {
    AsyncStorage.getItem(AVO_LANGUAGE_KEY).then((value) => {
      if (value && ["pl", "en", "de", "es", "fr"].includes(value)) {
        setAvoLanguageState(value as AvoLanguage);
      }
    });
  }, []);

  function getSettings(gotNotif: boolean): void {
    setNotif(gotNotif);
  }

  function setAvoLanguage(lang: AvoLanguage): void {
    setAvoLanguageState(lang);
    AsyncStorage.setItem(AVO_LANGUAGE_KEY, lang);
  }

  const value: SettingsContextType = {
    notif: notif,
    getSettings: getSettings,
    avoLanguage,
    setAvoLanguage,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsContextProvider;
