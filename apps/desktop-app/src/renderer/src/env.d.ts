/// <reference types="vite/client" />

interface Window {
  storeAPI: {
    getUsers(): Promise<string[]>;
    addUser(username: string): Promise<void>;
  };
}
