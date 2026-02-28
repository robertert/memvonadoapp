import React, { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { cloudFunctions } from "../services/cloudFunctions";

interface UserContextType {
  id: string | null;
  name: string | null;
  isAdmin: boolean;
  isUserLoaded: boolean;
  getUser: (name: string, id: string) => void;
  delUser: () => void;
}

export const UserContext = createContext<UserContextType>({
  id: null,
  name: null,
  isAdmin: false,
  isUserLoaded: false,
  getUser: (name: string, id: string) => {},
  delUser: () => {},
});

interface UserContextProviderProps {
  children: ReactNode;
}

function UserContextProvider({
  children,
}: UserContextProviderProps): React.JSX.Element {
  const [name, setName] = useState<string | null>("");
  const [id, setId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isUserLoaded, setIsUserLoaded] = useState<boolean>(false);

  function getUser(gotName: string, gotId: string): void {
    setId(gotId);
    setName(gotName);
  }

  function delUser(): void {
    setId(null);
    setName(null);
    setIsAdmin(false);
  }

  // Keep in sync with Firebase Auth (handles reload/fast refresh)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setId(user.uid);
        try {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          const data = snap.data();
          if (data && ((data as any).username || (data as any).name)) {
            setName(
              ((data as any).username || (data as any).name || "User") as string
            );
          } else if (!name) {
            setName("User");
          }
        } catch {
          if (!name) setName("User");
        }

        // Check admin status
        try {
          const adminResult = await cloudFunctions.isCurrentUserAdmin();
          setIsAdmin(adminResult.isAdmin);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setId(null);
        setName(null);
        setIsAdmin(false);
      }
      setIsUserLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const value: UserContextType = {
    id: id,
    name: name,
    isAdmin: isAdmin,
    isUserLoaded: isUserLoaded,
    getUser: getUser,
    delUser: delUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export default UserContextProvider;
