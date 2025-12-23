import { Plugin } from 'obsidian';
import { BibliographySettingTab } from './src/ui/settings-tab';
import { SettingsManager } from './src/managers/settings-manager';
import { ServiceManager } from './src/managers/service-manager';
import { CommandRegistry } from './src/managers/command-registry';
import type { BibliographyPluginSettings } from './src/types/settings';

export default class BibliographyPlugin extends Plugin {
    // Primary managers
    private settingsManager: SettingsManager;
    private serviceManager: ServiceManager;
    private commandRegistry: CommandRegistry;

    // Public accessor for settings
    public settings: BibliographyPluginSettings;

    async onload() {
        // Initialize the settings manager first
        this.settingsManager = new SettingsManager(this);
        this.settings = await this.settingsManager.loadSettings();

        // Initialize the service manager with loaded settings
        this.serviceManager = new ServiceManager(this.app, this.settings);

        // Initialize the command registry
        this.commandRegistry = new CommandRegistry(
            this.app,
            this,
            this.settings,
            this.serviceManager.getNoteCreationService()
        );

        // Register commands
        this.commandRegistry.registerCommands();

        // Add settings tab
        this.addSettingTab(new BibliographySettingTab(this.app, this));
    }

    /**
     * Update settings and related services
     */
    async saveSettings() {
        // Save the settings
        await this.settingsManager.saveSettings();

        // Update services with new settings
        this.serviceManager.updateSettings(this.settings);
    }

    /**
     * Update a partial set of settings
     */
    async updateSettings(newSettings: Partial<BibliographyPluginSettings>): Promise<void> {
        // Update and save the settings
        this.settings = await this.settingsManager.updateSettings(newSettings);

        // Update services with new settings
        this.serviceManager.updateSettings(this.settings);
    }

    /**
     * Clean up when plugin is disabled
     */
    onunload() {
        // Cleanup services
        this.serviceManager.onUnload();
    }
}