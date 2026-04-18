import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import Store from 'electron-store';

interface StoreSchema {
  users: string[];
}

const store = new Store<StoreSchema>({
  defaults: { users: [] },
});

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

ipcMain.handle('store:get-users', () => {
  return store.get('users');
});

ipcMain.handle('store:add-user', (_event, username: string) => {
  const users = store.get('users');
  if (!users.includes(username)) {
    store.set('users', [...users, username]);
  }
});

app.whenReady().then(() => {
  delete process.env['NODE_OPTIONS'];
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
