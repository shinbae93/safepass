import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

contextBridge.exposeInMainWorld('electron', electronAPI);

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => process.versions.electron,
});
