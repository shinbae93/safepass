import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import type Store from 'electron-store';

interface StoredUser {
  id: string;
  username: string;
}

interface StoreSchema {
  users: StoredUser[];
}

let store: Store<StoreSchema>;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  delete process.env['NODE_OPTIONS'];

  const { default: Store } = await import('electron-store');
  store = new Store<StoreSchema>({ defaults: { users: [] } });

  ipcMain.handle('store:get-users', () => store.get('users'));

  ipcMain.handle('store:add-user', (_event, user: StoredUser) => {
    const users = store.get('users');
    if (!users.find((u) => u.id === user.id)) {
      store.set('users', [...users, user]);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
