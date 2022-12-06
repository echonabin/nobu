import { app, BrowserWindow, ipcMain } from "electron";
import { BrowserTabsManager } from "./manager/BrowserTabsManager";

export class NobuBrowser {
    public window: BrowserWindow;
    public static SPACING_NO_TABS = 80 as const;
    public static SPACING_TABS = 125 as const;
    public SPACING_NO_TABS = NobuBrowser.SPACING_NO_TABS;
    public SPACING_TABS = NobuBrowser.SPACING_TABS;
    public tabs = new BrowserTabsManager(this);
    public channels = {
        "close-tab": (event, id) => {
            this.tabs.delete(id, true);
        },
        "history-back": (event) => {
            const can = this.tabs.current?.webContents.canGoBack();
            if (can) this.tabs.current?.webContents.goBack();
        },
        "history-forward": (event) => {
            const can = this.tabs.current?.webContents.canGoForward();
            if (can) this.tabs.current?.webContents.goForward();
        },
        navigate: (event, url) => {
            this.tabs.current?.webContents.loadURL(url);
        },
        "new-tab": (event) => {
            const tab = this.tabs.new();
            tab.webContents.loadURL("https://www.google.com");
            this.tabs.resize(tab);
        },
        "page-reload": (event) => {
            this.tabs.current?.webContents.reload();
        },
        "page-reload-cancel": (event) => {
            this.tabs.current?.webContents.stop();
        },
        "set-tab": (event, id) => {
            this.tabs.setCurrentTab(id);
        },
        "get-tabs": (event) => {
            this.tabs.broadcastTabs();
        }
    } as NobuIncomingChannelsHandler;
    public constructor() {
        this.window = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                devTools: this.devMode,
                preload: `${__dirname}/preload/main.js`
            },
            show: false,
            icon: `file://${__dirname}/../public/nobu.png`,
            backgroundColor: "#2b2b2b"
        });

        this._loadContent();
        this._attachListeners();
    }

    private _attachListeners() {
        Object.entries(this.channels).forEach(([name, listener]) => {
            ipcMain.on(name, listener);
        });
    }

    private _removeListeners() {
        Object.entries(this.channels).forEach(([name, listener]) => {
            ipcMain.off(name, listener);
        });
    }

    public get devMode() {
        return !app.isPackaged;
    }

    private _loadContent() {
        if (this.devMode) {
            this.window.loadURL("http://localhost:3000");
        } else {
            this.window.loadFile(`${__dirname}/../dist/index.html`);
        }
    }

    public create() {
        this.window.show();
        if (this.window.isMaximizable()) this.window.maximize();
        this.tabs.broadcastTabs();
    }

    public close() {
        this._removeListeners();
        for (const v of Object.values(this.tabs.views)) {
            this.tabs.delete(v, false);
        }
        this.window.destroy();
    }

    public send<K extends keyof NobuDispatchChannels>(channel: K, ...args: NobuDispatchChannels[K]) {
        this.window.webContents.send(channel, ...args);
    }
}
