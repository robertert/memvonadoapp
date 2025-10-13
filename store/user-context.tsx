import React, { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

interface UserContextType {
  id: string | null;
  name: string | null;
  getUser: (name: string, id: string) => void;
  delUser: () => void;
}

export const UserContext = createContext<UserContextType>({
  id: null,
  name: null,
  getUser: (name: string, id: string) => {},
  delUser: () => {},
});

interface UserContextProviderProps {
  children: ReactNode;
}

function UserContextProvider({ children }: UserContextProviderProps): React.JSX.Element {
  const [name, setName] = useState<string | null>("");
  const [id, setId] = useState<string | null>(null);

  function getUser(gotName: string, gotId: string): void {
    setId(gotId);
    setName(gotName);
  }

  function delUser(): void {
    setId(null);
    setName(null);
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
          if (data && (data as any).name) {
            setName((data as any).name as string);
          } else if (!name) {
            setName("User");
          }
        } catch {
          if (!name) setName("User");
        }
      } else {
        setId(null);
        setName(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const value: UserContextType = {
    id: id,
    name: name,
    getUser: getUser,
    delUser: delUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export default UserContextProvider;
