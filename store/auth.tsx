import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { cloudFunctions } from "../services/cloudFunctions";

export type AuthStatus = "loading" | "unauthenticated" | "needs_onboarding" | "ready";

interface AuthContextValue {
  status: AuthStatus;
  userId: string | null;
  username: string | null;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  userId: null,
  username: null,
  isAdmin: false,
  refreshUser: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("unauthenticated");
        setUserId(null);
        setUsername(null);
        setIsAdmin(false);
        return;
      }

      setUserId(user.uid);

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          try {
            await cloudFunctions.ensureUserDocument();
          } catch (e) {
            console.error("Error creating user document:", e);
          }
          setStatus("needs_onboarding");
          return;
        }

        const data = snap.data();
        if (!data?.profileCompleted) {
          setStatus("needs_onboarding");
          return;
        }

        const name = (data.username || data.name || "User") as string;
        setUsername(name);

        try {
          const adminResult = await cloudFunctions.isCurrentUserAdmin();
          setIsAdmin(adminResult.isAdmin);
        } catch {
          setIsAdmin(false);
        }

        setStatus("ready");
      } catch (e) {
        console.error("Error in auth state handler:", e);
        try {
          await cloudFunctions.ensureUserDocument();
        } catch {}
        setStatus("needs_onboarding");
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists() || !snap.data()?.profileCompleted) return;

      const data = snap.data();
      const name = (data.username || data.name || "User") as string;
      setUsername(name);
      setStatus("ready");
    } catch (e) {
      console.error("Error refreshing user:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ status, userId, username, isAdmin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
