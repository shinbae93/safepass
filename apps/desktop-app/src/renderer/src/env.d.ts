/// <reference types="vite/client" />

interface StoredUser {
  id: string;
  username: string;
}

interface Window {
  storeAPI: {
    getUsers(): Promise<StoredUser[]>;
    addUser(user: StoredUser): Promise<void>;
  };
}
