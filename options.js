jQuery(document).ready(function($){
	var email = (function(){
		coded = "49vVNJ@y36Ws4sWA.4VN"
		key = "bP3Oc7k8xzM2dnm0oWZplqEw4SKf1UDBr6NeVCTAshItiLYyjQu5vXHJFRGag9"
		shift = coded.length
		output = ""
		for (i = 0; i < coded.length; i++) {
			if (key.indexOf(coded.charAt(i)) == -1) {
				ltr = coded.charAt(i)
				output += (ltr)
			} else {
				ltr = (key.indexOf(coded.charAt(i)) - shift + key.length) % key.length
				output += (key.charAt(ltr))
			}
		}
		return output;
	})();
	$('#contact-link').attr('href', 'mailto:'+email).find('span').html(email);

	$('#cpau_version_label').html(chrome.runtime.getManifest().version);

	OptionFormManager.init();

	$('#formats input[type=radio]').change(function(e){
		chrome.storage.local.set({"format": $(this).val()});
		OptionFormManager.init();
	});

	$('#format_html_advanced input[type=radio]').change(function(e){
		chrome.storage.local.set({"anchor": $(this).val()});
		OptionFormManager.init();
	});

	$('#format_custom_advanced>textarea').change(function(e){
		chrome.storage.local.set({"format_custom_advanced": $(this).val()});
		OptionFormManager.init();
	});

	$('#intelligent_paste').change(function(e){
		chrome.storage.local.set({"intelligent_paste": $(this).prop("checked").toString()});
		OptionFormManager.init();
	});

	$('#walk_all_windows').change(function(e){
		chrome.storage.local.set({"walk_all_windows": $(this).prop("checked").toString()});
		OptionFormManager.init();
	});

	$('#highlighted_tab_only').change(function(e){
		chrome.storage.local.set({"highlighted_tab_only": $(this).prop("checked").toString()});
		OptionFormManager.init();
	});

	$('#default_action').change(function(e){
		chrome.storage.local.set({"default_action": $(this).val()});
		OptionFormManager.init();
	});

	$('#mime').change(function(e){
		chrome.storage.local.set({"mime": $(this).val()});
		OptionFormManager.init();
	});

	$('#reset_settings').click(function(e){
		OptionFormManager.optionsReset();
	});

	var currentYear = new Date().getFullYear();
	if( $('#copyright-year-footer').text() < currentYear ){
		$('#copyright-year-footer').text(currentYear);
	}

	$('.open-link-via-chrome-api').click(function(e){
		e.preventDefault();
		e.stopImmediatePropagation();
		var href = $(this).attr('href');
		if (href == undefined) {
			return;
		}
		if ($(this).hasClass('on-new-tab')) {
			chrome.tabs.create({url: href});
		} else {
			chrome.tabs.update({url: href});
		}
	});

	chrome.runtime.sendMessage({type: 'getUpdateStatus'}, function(response) {
		if (response && response.updateNotify) {
			var content = "<h3>New version recently installed : " + chrome.runtime.getManifest().version + "</h3>"
				+ "Check the " + '<a href="https://vincepare.github.io/CopyAllUrl_Chrome/" data-galinkid="changelog recent update">' + "changelog</a> to see what's new !<br>"
				+ "<em>This notice will go off automatically</em>";
			$('#recently-updated').html(content).show();
		}
	});

	$('.hero-unit .paypal-donate form').click(function(e){
		e.stopImmediatePropagation();
	});
	$('#donate-paypal form').click(function(e){
		e.stopImmediatePropagation();
	});
	$('#donate-flattr a').click(function(e){
		e.stopImmediatePropagation();
	});
	$('#donate-bitcoin img').click(function(e){
		e.stopImmediatePropagation();
	});
	$('#contact-link').click(function(e){
		e.stopImmediatePropagation();
	});
	$('a').click(function(e){
		var href = $(this).attr('href');
		try {
			if (!href.match(/^\s*http/i)) {
				return;
			}
		} catch(ex) {
			return;
		}
		e.stopImmediatePropagation();
	});
});

var OptionFormManager = {
	init: function(){
		chrome.storage.local.get(['format', 'anchor', 'format_custom_advanced', 'intelligent_paste', 'walk_all_windows', 'highlighted_tab_only', 'default_action', 'mime'], function(result) {
			var format = result.format || 'text';
			var anchor = result.anchor || 'url';
			var format_custom_advanced = result.format_custom_advanced || '';
			var intelligent_paste = result.intelligent_paste === true || result.intelligent_paste === 'true';
			var walk_all_windows = result.walk_all_windows === true || result.walk_all_windows === 'true';
			var highlighted_tab_only = result.highlighted_tab_only === true || result.highlighted_tab_only === 'true';
			var default_action = result.default_action || "menu";
			var mime = result.mime || 'plaintext';

			this.cocherFormat(format);

			jQuery('#format_html_advanced input[type=radio]').attr('checked', false);
			jQuery('#format_html_anchor_' + anchor).attr('checked', true);

			jQuery('#format_custom_advanced>textarea').val(format_custom_advanced);

			$('#format_html_advanced').hide();
			$('#format_custom_advanced').hide();
			if( format == 'html' ){
				$('#format_html_advanced').show();
			}
			if( format == 'custom' ){
				$('#format_custom_advanced').show();
			}

			jQuery('#intelligent_paste').prop('checked', intelligent_paste);

			jQuery('#walk_all_windows').prop('checked', walk_all_windows);

			jQuery('#highlighted_tab_only').prop('checked', highlighted_tab_only);

			jQuery('#default_action').val(default_action);

			jQuery('#mime').val(mime);
		}.bind(this));
	},

	cocherFormat: function(option){
		jQuery('#formats input[type=radio]').attr('checked', false);
		jQuery('#format_' + option).attr('checked', true);
	},

	optionsReset: function(){
		chrome.storage.local.remove(['format', 'anchor', 'format_custom_advanced', 'intelligent_paste', 'walk_all_windows', 'highlighted_tab_only', 'default_action', 'mime'], function() {
			this.init();
		}.bind(this));
	}
};