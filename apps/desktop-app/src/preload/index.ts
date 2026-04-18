import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

contextBridge.exposeInMainWorld('electron', electronAPI);

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('storeAPI', {
  getUsers: (): Promise<string[]> => ipcRenderer.invoke('store:get-users'),
  addUser: (username: string): Promise<void> => ipcRenderer.invoke('store:add-user', username),
});
