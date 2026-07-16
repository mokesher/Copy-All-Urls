const Clipboard = {
	write: function(str, extended_mime) {
		if (str == '' || str == undefined) {
			str = '<empty>';
		}

		const textarea = document.createElement('textarea');
		textarea.value = str;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();

		const oncopyBackup = document.oncopy;
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
		document.body.removeChild(textarea);
	},

	read: function() {
		const textarea = document.createElement('textarea');
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand('paste');
		const result = textarea.value;
		document.body.removeChild(textarea);
		return result;
	}
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.type === 'clipboardWrite') {
		Clipboard.write(request.data, request.extended_mime);
		sendResponse({success: true});
	} else if (request.type === 'clipboardRead') {
		const data = Clipboard.read();
		sendResponse({success: true, data: data});
	}
});