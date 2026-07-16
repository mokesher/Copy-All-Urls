const CopyTo = {
	html: function(tabs, anchor) {
		let s = '';
		for (let i = 0; i < tabs.length; i++) {
			let row_anchor = tabs[i].url;
			if (anchor == 'title') {
				row_anchor = tabs[i].title;
			}
			s += '<a href="' + tabs[i].url + '">' + row_anchor + '</a><br/>\n';
		}
		return s;
	},

	custom: function(tabs, template) {
		if (!template) {
			return 'ERROR : Row template is empty ! (see options page)';
		}
		let s = '';
		for (let i = 0; i < tabs.length; i++) {
			let current_row = template;
			let current_url = tabs[i].url;
			let current_title = tabs[i].title;
			current_row = current_row.replace(/\$url/gi, current_url);
			current_row = current_row.replace(/\$title/gi, current_title);
			s += current_row;
		}
		return s;
	},

	text: function(tabs) {
		let s = '';
		for (let i = 0; i < tabs.length; i++) {
			s += tabs[i].url + '\n';
		}
		return s;
	},

	json: function(tabs) {
		let data = [];
		for (let i = 0; i < tabs.length; i++) {
			data.push({url: tabs[i].url, title: tabs[i].title});
		}
		return JSON.stringify(data);
	}
};

const OffscreenManager = {
	ensureOffscreen: function() {
		return new Promise(function(resolve, reject) {
			if (chrome.offscreen) {
				chrome.offscreen.hasDocument(function(hasDocument) {
					if (hasDocument) {
						resolve();
					} else {
						chrome.offscreen.createDocument({
							url: chrome.runtime.getURL('offscreen.html'),
							reasons: ['CLIPBOARD'],
							justification: 'Access clipboard for copy/paste operations'
						}, function() {
							if (chrome.runtime.lastError) {
								reject(chrome.runtime.lastError);
							} else {
								resolve();
							}
						});
					}
				});
			} else {
				reject(new Error('Offscreen API not available'));
			}
		});
	},

	writeToClipboard: function(data, extended_mime) {
		return new Promise(function(resolve, reject) {
			OffscreenManager.ensureOffscreen().then(function() {
				chrome.runtime.sendMessage({type: 'clipboardWrite', data: data, extended_mime: extended_mime}, function(response) {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve(response);
					}
				});
			}).catch(reject);
		});
	},

	readFromClipboard: function() {
		return new Promise(function(resolve, reject) {
			OffscreenManager.ensureOffscreen().then(function() {
				chrome.runtime.sendMessage({type: 'clipboardRead'}, function(response) {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve(response.data);
					}
				});
			}).catch(reject);
		});
	}
};

const Action = {
	copy: function(opt) {
		let tabQuery = {windowId: opt.window.id};

		chrome.storage.local.get(['walk_all_windows'], function(result) {
			if (result.walk_all_windows === 'true') {
				tabQuery.windowId = null;
			}

			chrome.tabs.query(tabQuery, function(tabs) {
				chrome.storage.local.get(['format', 'highlighted_tab_only', 'mime', 'anchor', 'format_custom_advanced'], function(result) {
					let format = result.format || 'text';
					let highlighted_tab_only = result.highlighted_tab_only === 'true';
					let extended_mime = result.mime === 'html';
					let anchor = result.anchor || 'url';
					let format_custom_advanced = result.format_custom_advanced || '';

					let tabs_filtered = tabs.filter(function(tab) {
						if (highlighted_tab_only && !tab.highlighted) return false;
						return true;
					});

					let outputText = '';
					if (format == 'html') {
						outputText = CopyTo.html(tabs_filtered, anchor);
					} else if (format == 'custom') {
						outputText = CopyTo.custom(tabs_filtered, format_custom_advanced);
					} else if (format == 'json') {
						outputText = CopyTo.json(tabs_filtered);
						extended_mime = false;
					} else {
						outputText = CopyTo.text(tabs_filtered);
						extended_mime = false;
					}

					if (opt.fromShortcut) {
						OffscreenManager.writeToClipboard(outputText, extended_mime).catch(function() {});
					} else {
						try {
							chrome.runtime.sendMessage({type: 'copyData', data: outputText, extended_mime: extended_mime, count: tabs_filtered.length});
						} catch(e) {}
					}
				});
			});
		});
	},

	paste: function(opt) {
		chrome.storage.local.get(['intelligent_paste'], function(result) {
			let intelligent_paste = result.intelligent_paste === 'true';

			if (opt.fromShortcut) {
				OffscreenManager.readFromClipboard().then(function(clipboardString) {
					let urlList;
					if (intelligent_paste) {
						urlList = clipboardString.match(/(https?|ftp|ssh|mailto):\/\/[a-z0-9\/:%_+.,#?!@&=-]+/gi);
					} else {
						urlList = clipboardString.split("\n");
					}

					if (urlList == null) {
						return;
					}

					urlList = urlList.map(function(val) {
						let matches = val.match(new RegExp('<a[^>]+href="([^"]+)"', 'i'));
						try {
							return matches[1];
						} catch(e) {
							return val;
						}
					}).map(function(val) {
						return val.trim();
					}).filter(function(url) {
						return url && url !== "";
					});

					urlList.forEach(function(url) {
						try {
							chrome.tabs.create({url: url});
						} catch(e) {}
					});
				}).catch(function() {});
			} else {
				try {
					chrome.runtime.sendMessage({type: 'pasteRequest', intelligent_paste: intelligent_paste});
				} catch(e) {}
			}
		});
	}
};

const UpdateManager = {
	updateNotify: function() {
		return new Promise(function(resolve) {
			chrome.storage.local.get(['update_notify', 'update_last_time'], function(result) {
				if (result.update_notify !== 'true') {
					resolve(false);
					return;
				}
				try {
					let timeDiff = Date.now() - parseInt(result.update_last_time);
					if (timeDiff < 1000 * 3600 * 24) {
						resolve(true);
					} else {
						resolve(false);
					}
				} catch (ex) {
					resolve(false);
				}
			});
		});
	},

	setBadge: function() {
		UpdateManager.updateNotify().then(function(shouldNotify) {
			if (!shouldNotify) {
				chrome.action.setBadgeText({text: ''});
				return;
			}
			chrome.action.setBadgeText({text: 'NEW'});
		});
	},

	checkUpdate: function(details) {
		if (details.reason !== 'update') {
			return;
		}

		if (details.previousVersion === chrome.runtime.getManifest().version) {
			return;
		}

		chrome.storage.local.set({
			'update_last_time': Date.now(),
			'update_previous_version': details.previousVersion
		});

		UpdateManager.setBadge();

		chrome.notifications.onClicked.addListener(function(notificationId) {
			if (notificationId == 'cpau_update_notification') {
				chrome.tabs.create({url: 'https://vincepare.github.io/CopyAllUrl_Chrome/'});
			}
		});

		UpdateManager.updateNotify().then(function(shouldNotify) {
			if (shouldNotify) {
				chrome.notifications.create('cpau_update_notification', {
					type: 'basic',
					title: 'Copy All Urls updated',
					message: 'New version installed : ' + chrome.runtime.getManifest().version + '. Click to see new features.',
					iconUrl: 'img/umbrella_128.png'
				});
			}
		});
	}
};

UpdateManager.setBadge();

chrome.runtime.onInstalled.addListener(function(details) {
	UpdateManager.checkUpdate(details);
});

chrome.commands.onCommand.addListener(function(command) {
	switch(command) {
		case 'copy':
			chrome.windows.getCurrent(function(win) {
				Action.copy({window: win, fromShortcut: true});
			});
			break;
		case 'paste':
			Action.paste({fromShortcut: true});
			break;
	}
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.type === 'getUpdateStatus') {
		UpdateManager.updateNotify().then(function(status) {
			sendResponse({updateNotify: status});
		});
		return true;
	}
	if (request.type === 'copy') {
		Action.copy({window: {id: request.windowId}, fromShortcut: false});
		return true;
	}
	if (request.type === 'paste') {
		Action.paste({fromShortcut: false});
		return true;
	}
});