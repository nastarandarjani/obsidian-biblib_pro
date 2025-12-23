import { App, Platform } from 'obsidian';
import type { ConnectorServer } from './connector-server';

export class StatusBarService {
    private statusBarItem: HTMLElement | null = null;
    private app: App;
    private connectorServer: ConnectorServer | null = null;

    constructor(app: App, connectorServer: ConnectorServer | null = null) {
        this.app = app;
        this.connectorServer = connectorServer;
    }

    /**
     * Remove the status bar item
     */
    public remove(): void {
        if (this.statusBarItem) {
            this.statusBarItem.remove();
            this.statusBarItem = null;
        }
    }
}
