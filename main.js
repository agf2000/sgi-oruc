// Modules to control application life and create native browser window
const electron = require('electron');
const { app, Tray, BrowserWindow, Menu, ipcMain, dialog, Notification } = electron;
const path = require('path');
// const fse = require('fs-extra');
// const destPath = 'c:\\softer\\config';
const iconPath = path.join(__dirname, 'img/icon.png');
// const url = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

require('./src/services/api.js');

let appIcon = null,
	win = null,
	aboutWindow = null,
	configWindow = null,
	mainWindow = null;

// function createWindow() {
function startApp() {
	win = new BrowserWindow({
		show: false,
	});

	appIcon = new Tray(iconPath);

	var contextMenu = Menu.buildFromTemplate([
		{
			label: 'Abrir',
			click(item, focusedWindow) {
				openMainWindow();
			},
			// type: 'normal',
			// role: 'front',
		},
		{
			label: 'Configurações',
			click(item, focusedWindow) {
				openConfigWindow();
			},
		},
		{
			label: 'Fechar',
			click() {
				// dialog.showMessageBox(
				// 	win,
				// 	{
				// 		type: 'question',
				// 		title: 'Atenção!',
				// 		message: 'Tem certeza que deseja fechar o aplicativo de sincronização com Oruc?',
				// 		buttons: ['Sim', 'Não'],
				// 		defaultId: 1,
				// 		noLink: true,
				// 	},
				// 	(resp) => {
				// 		if (resp == 0) {
				app.quit();
				// 		}
				// 	}
				// );
			},
		},
		{
			label: 'Sobre',
			click(item, focusedWindow) {
				openAboutWindow();
			},
		},
	]);

	appIcon.setToolTip('SGI-Oruc');
	appIcon.getIgnoreDoubleClickEvents(false);
	appIcon.setContextMenu(contextMenu);

	app.setAppUserModelId('com.br.softernet.sgi-oruc-tray');

	const opt = {
		title: 'Atenção!',
		subtitle: 'Aplicativo minimizado.',
		body: 'O aplicativo SGI-Oruc está ativo na barra de tarefas.',
		icon: iconPath,
	};

	new Notification(opt).show();

	// Open the DevTools.
	// win.webContents.openDevTools();
}

// Configurações menu
const configMenuTemplate = [
	{
		label: 'Recarregar',
		accelerator: 'CmdOrCtrl+R',
		click(item, focusedWindow) {
			if (focusedWindow) focusedWindow.reload();
		},
	},
	{
		label: 'Ferramentas',
		submenu: [
			{
				label: 'Diagnóstico',
				accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
				click(item, focusedWindow) {
					if (focusedWindow) focusedWindow.webContents.toggleDevTools();
				},
			},
		],
	},
	{
		label: 'Fechar',
		click(item, focusedWindow) {
			if (focusedWindow) focusedWindow.close();
		},
	},
];

// Configurações
function openConfigWindow() {
	if (configWindow) {
		configWindow.focus();
		return;
	}

	configWindow = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true,
		},
		title: 'Configurações',
		minimizable: false,
		parent: win,
		fullscreenable: false,
		width: 660,
		height: 520,
		autoHideMenuBar: true,
		icon: path.join(__dirname, 'build/icon.ico'),
	});

	configWindow.setMenu(null);

	configWindow.loadURL('file://' + __dirname + './src/html/config.html');

	const configMenu = Menu.buildFromTemplate(configMenuTemplate);

	// // Insert menu
	configWindow.setMenu(configMenu);

	configWindow.on('closed', function () {
		// mainWindow.reload();
		configWindow = null;
	});

	// Open the DevTools.
	configWindow.webContents.openDevTools();
}

function openAboutWindow() {
	aboutWindow = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true,
		},
		parent: win,
		modal: true,
		show: false,
		// x: 0,
		// y: 0,
		// frame: false,
		alwaysOnTop: true,
		autoHideMenuBar: true,
		minimizable: false,
		width: 460,
		height: 380,
		resizable: false,
		icon: path.join(__dirname, 'build/icon.ico'),
	});

	aboutWindow.loadURL('file://' + __dirname + './src/html/about.html');

	aboutWindow.once('ready-to-show', () => {
		aboutWindow.show();
	});

	aboutWindow.on('closed', function () {
		// mainWindow.reload();
		aboutWindow = null;
	});

	// Open the DevTools.
	aboutWindow.webContents.openDevTools();
}

/**
 * Open main window
 */
function openMainWindow(arg) {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		x: 10,
		y: 10,
		parent: win,
		autoHideMenuBar: true,
		resizable: false,
		webPreferences: {
			// preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
		},
	});

	// and load the index.html of the app.
	mainWindow.loadFile('./src/html/index.html');

	// Open the DevTools.
	mainWindow.webContents.openDevTools();

	mainWindow.on('closed', function () {
		// mainWindow.reload();
		mainWindow = null;
	});
}

/**
 * Basic menu template
 */
const basicMenuTemplate = [
	{
		label: 'Recarregar',
		accelerator: 'CmdOrCtrl+R',
		click(item, focusedWindow) {
			if (focusedWindow) focusedWindow.reload();
		},
	},
	{
		label: 'Ferramentas',
		submenu: [
			{
				label: 'Diagnóstico',
				accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
				click(item, focusedWindow) {
					if (focusedWindow) focusedWindow.webContents.toggleDevTools();
				},
			},
		],
	},
	{
		label: 'Fechar',
		click(item, focusedWindow) {
			if (focusedWindow) focusedWindow.close();
		},
	},
];

// Listen for the app to be ready
app.on('ready', startApp);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.whenReady().then(createWindow);

// Quit when all windows are closed.
// app.on('window-all-closed', function () {
// 	// On macOS it is common for applications and their menu bar
// 	// to stay active until the user quits explicitly with Cmd + Q
// 	if (process.platform !== 'darwin') app.quit();
// });

// app.on('activate', function () {
// 	// On macOS it's common to re-create a window in the app when the
// 	// dock icon is clicked and there are no other windows open.
// 	if (BrowserWindow.getAllWindows().length === 0) createWindow();
// });

//-------------------------------------------------------------------
// Auto updates
//-------------------------------------------------------------------
const sendStatusToWindow = (text) => {
	log.info(text);
	aboutWindow.webContents.send('update-content', text);
};

ipcMain.on('checkForUpdates', checkForUpdates);

function checkForUpdates() {
	// trigger autoupdate check
	autoUpdater.checkForUpdates();
}

autoUpdater.on('checking-for-update', () => {
	sendStatusToWindow('Procurando por atualização...');
});

autoUpdater.on('update-available', (info) => {
	sendStatusToWindow('Atualização disponível.');
});

autoUpdater.on('update-not-available', (info) => {
	sendStatusToWindow('Atualização não disponível.');
});

autoUpdater.on('error', (err) => {
	sendStatusToWindow(`Error no atualizador: ${err.toString()}`);
});

autoUpdater.on('download-progress', (progressObj) => {
	sendStatusToWindow(
		`Velocidade: ${formatBytes(progressObj.bytesPerSecond)} /seg
         <br />Baixado: ${progressObj.percent.toFixed(2)}%
         <br />(${formatBytes(progressObj.transferred)} de ${formatBytes(progressObj.total)} + )`
	);
});

autoUpdater.on('update-downloaded', (info) => {
	sendStatusToWindow('Atualização baixada; Começando a atualização...');
});

autoUpdater.on('update-downloaded', (info) => {
	// Wait 5 seconds, then quit and install
	// In your application, you don't need to wait 500 ms.
	// You could call autoUpdater.quitAndInstall(); immediately
	autoUpdater.quitAndInstall();
});

function formatBytes(bytes, decimals) {
	if (bytes == 0) return '0 Bytes';
	var k = 1024,
		dm = decimals <= 0 ? 0 : decimals || 2,
		sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
