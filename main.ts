import { App, Editor, MarkdownView, Modal, Notice, debounce, WorkspaceWindow, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	patterns: [{ source: string, replacement: string }];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	patterns: [{ source: '', replacement: '' }],
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new AutreplaceSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.registerEvent(
			this.app.workspace.on("file-open", this.replaceContent)
		)

		// this.registerEvent(
		// 	this.app.workspace.on("editor-change", debounce(this.replaceContent, 1000))
		// )
	}


	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	replaceContent = () => {
		const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (mdView && mdView.getViewData()) {
			const text = mdView.getViewData();
			const [result, count] = this.replaceInputString(text)
			if (count) {
				mdView.setViewData(result, false);
				new Notice(`Autoreplace: ${count} items replaced.`);
			}
		}
	}

	replaceInputString(text: string): [string, number] {
		let targetText = text;
		let count = 0;
		this.settings.patterns.forEach(e => {
			let idx = 0;
			while ((idx = targetText.indexOf(e.source, idx)) >= 0) {
				const start = targetText.substring(0, idx);
				const end = targetText.substring(idx + e.source.length);
				targetText = start + e.replacement + end;
				idx += e.source.length;
				count++;
			}
			// targetText = targetText.replace(new RegExp(e.source, 'g'), e.replacement);
		});
		return [targetText, count];
	}
}

class AutreplaceSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	refresh(): void {
		this.display();
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Autreplace settings.' });

		this.plugin.settings.patterns.forEach((pattern, index) => {
			const data = { ...pattern };
			const setting = this.makePatternRow(containerEl, `#${index}`, data)
				.addButton((button) => {
					button.setButtonText("Save").onClick(async (evt) => {
						this.plugin.settings.patterns[index] = data;
						await this.plugin.saveSettings();
						this.refresh();
					})
				}).addButton((button) => {
					button.setButtonText("Remove").setClass("settings-delete-btn")
						.onClick(async (evt) => {
							this.plugin.settings.patterns.splice(index, 1);
							await this.plugin.saveSettings();
							this.refresh();
						});
				});
		});
		const data = { source: '', replacement: '' };
		const setting = this.makePatternRow(containerEl, "New", data).addButton((button) => {
			button.setButtonText("Add").onClick(async (evt) => {
				if (!(data.source && data.replacement) || setting.controlEl.querySelector('.autoreplace-setting-error')) {
					return;
				}
				this.plugin.settings.patterns.push(data);
				await this.plugin.saveSettings();
				this.refresh();
			});
		});
	}

	makePatternRow(containerEl: HTMLElement, label: string, data: { source: string, replacement: string }): Setting {
		const rowClass = 'autoreplace-setting-section';
		const setting = new Setting(containerEl).setClass(rowClass);

		setting.setName(label);
		setting.addText((text) => {
			text.setValue(data.source)
				.setPlaceholder("Input").onChange((value) => {
					text.inputEl.removeClass('autoreplace-setting-error');
					data.source = value;
				});
		});
		setting.addText((text) => {
			text.setValue(data.replacement)
				.setPlaceholder("Replacement").onChange((value) => {
					text.inputEl.removeClass('autoreplace-setting-error');
					data.replacement = value;
				});
		});
		return setting;
	}
}
