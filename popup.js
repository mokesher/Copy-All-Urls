var clipboardBuffer;

var Clipboard = {
	write: function(str, extended_mime) {
		if (str == '' || str == undefined) {
			str = '<empty>';
		}

		clipboardBuffer.val(str);
		clipboardBuffer.select();

		var oncopyBackup = document.oncopy;
		document.oncopy = function(e) {
			if (typeof extended_mime == "undefined" || extended_mime != true) {
				return;
			}
			e.preventDefault();
			e.clipboardData.setData("text/html", str);
			e.clipboardData.setData("text/plain", str);
		};
		document.execCommand('copy');
		document.oncopy = oncopyBackup;
	},

	read: function() {
		clipboardBuffer.val('');
		clipboardBuffer.select();
		document.execCommand('paste');
		return clipboardBuffer.val();
	}
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (typeof request.type != 'string') return;
	switch(request.type) {
		case 'copyData':
			Clipboard.write(request.data, request.extended_mime);
			var nombre = (request.count > 1) ? 's' : '';
			jQuery('#message').removeClass('error').html("<b>" + request.count + "</b> url" + nombre + " successfully copied !");
			setTimeout(function() { window.close(); }, 3000);
			break;
		case 'pasteRequest':
			var clipboardString = Clipboard.read();
			var urlList;

			if (request.intelligent_paste) {
				urlList = clipboardString.match(/(https?|ftp|ssh|mailto):\/\/[a-z0-9\/:%_+.,#?!@&=-]+/gi);
			} else {
				urlList = clipboardString.split("\n");
			}

			if (urlList == null) {
				jQuery('#message').addClass('error').html("No URL found in the clipboard");
				return;
			}

			jQuery.each(urlList, function(key, val) {
				var matches = val.match(new RegExp('<a[^>]+href="([^"]+)"', 'i'));
				try {
					urlList[key] = matches[1];
				} catch(e) {}
				urlList[key] = jQuery.trim(urlList[key]);
			});

			urlList = urlList.filter(function(url) {
				if (url == "" || url == undefined) {
					return false;
				}
				return true;
			});

			jQuery.each(urlList, function(key, val) {
				chrome.tabs.create({url: val});
			});

			window.close();
			break;
	}
});

jQuery(function($) {
	clipboardBuffer = $('<textarea id="clipboardBuffer"></textarea>');
	clipboardBuffer.appendTo('body');

	$('#actionCopy').on('click', function(e, fromDefaultAction) {
		chrome.windows.getCurrent(function(win) {
			chrome.runtime.sendMessage({type: 'copy', windowId: win.id});
		});
	});

	$('#actionPaste').on('click', function(e, fromDefaultAction) {
		chrome.runtime.sendMessage({type: 'paste'});
	});

	$('#actionOption').click(function(e) {
		chrome.runtime.openOptionsPage();
	});

	$('#contribute a').click(function(e) {
		chrome.tabs.create({url: 'options.html#donate'});
	});

	chrome.storage.local.get(['default_action'], function(result) {
		var default_action = result.default_action || "menu";
		if (default_action != "menu") {
			$('body>ul').hide();
			$('#message').css({'padding': '3px 0 5px'});

			switch(default_action) {
				case "copy":
					$('#actionCopy').trigger('click', [true]);
					break;
				case "paste":
					$('#actionPaste').trigger('click', [true]);
					break;
			}
		}
	});

	chrome.runtime.sendMessage({type: 'getUpdateStatus'}, function(response) {
		if (response && response.updateNotify) {
			var content = "New version recently installed. Check the <a href=\"https://vincepare.github.io/CopyAllUrl_Chrome/\">changelog</a>.";
			$('#recently-updated').html(content).show().find('a').click(function(e) {
				chrome.tabs.create({url: $(this).attr('href')});
			});
		}
	});
});