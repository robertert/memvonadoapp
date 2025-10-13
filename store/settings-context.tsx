import React, { createContext, useState, ReactNode } from "react";

interface SettingsContextType {
  notif: boolean;
  getSettings: (notif: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  notif: true,
  getSettings: (notif: boolean) => {},
});

interface SettingsContextProviderProps {
  children: ReactNode;
}

function SettingsContextProvider({ children }: SettingsContextProviderProps): React.JSX.Element {
  const [notif, setNotif] = useState<boolean>(true);

  function getSettings(gotNotif: boolean): void {
    setNotif(gotNotif);
  }

  const value: SettingsContextType = {
    notif: notif,
    getSettings: getSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsContextProvider;
