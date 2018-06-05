!function () {
	"use strict";

	// init highlight CSS
	var ruleExistenceDict = {};
	var sheet = (function() {
		var style = document.createElement("style");
		style.appendChild(document.createTextNode(""));	// WebKit hack @@
		document.head.appendChild(style);
		return style.sheet;
	})();

	////////////////////////////////////////////////
	// highlight word in DOM (textnode only)
	var highlightWordByJquery = function (word, bgColorCode) {
		var cssClass = "chrome-extension-highlight-".concat(bgColorCode);
		//$('body').highlight(word, cssClass);
	};
	////////////////////////////////////////////////

	// highlight word in DOM (keyword can be across multi tag)
	var highlightWordAcrossNode = function (word, bgColorCode) {

		// reset cursor
		window.getSelection().removeAllRanges();

		// find keyword ranges
		var rangeList = [];
		if (window.find(word, false, false, false, false, false, false)) {
			do {
				rangeList.push(window.getSelection().getRangeAt(0));
				// don't modify the range here, cursor in find() will be corrupted
			} while (window.find(word, false, false, false, false, false, false));
			// reset scroll position, window.find() will select the last word...
			//window.scrollTo(0, 0);
		} else {
			console.log("[highlightWordAcrossNode] nothing found", word, bgColorCode, document.title);
		}

		// highlight all ranges
		rangeList.forEach(function (r) {
			highlightRange(r, bgColorCode);
		});
	};
	// highlight the keyword by surround it by `i`
	var highlightRange = function (range, bgColorCode) {

		// create wrapping i
		var iNode = document.createElement("i");
		var selectorName = iNode.className = "chrome-extension-highlight-".concat(bgColorCode);
		iNode.classList.add("chrome-extension-highlight");

		// add highlight class style in CSS
		if (!ruleExistenceDict[bgColorCode]) {
			sheet.insertRule([".", selectorName, " { background: #", bgColorCode, " !important; }"].join(""), 0);
			ruleExistenceDict[bgColorCode] = true;
			console.log(sheet);
		}

		// range.surroundContents(iNode) will throw exception if word across multi tag
		iNode.appendChild(range.extractContents());
		range.insertNode(iNode);
	};
	// highlight all keywords by its colour
	var highlightAllWords = function (wordGroupsDict) {

		var highlightWordFunction;
		if (window.find) {
			highlightWordFunction = highlightWordAcrossNode;
			// alternative: https://github.com/timdown/rangy/wiki/Highlighter-Module
		} else {
			console.log("window.find() function not exists, only textnode will be searched");
			highlightWordFunction = highlightWordByJquery;
		}

		// for each group, highlight all its words
		Object.keys(wordGroupsDict).forEach(function (groupName) {
			if (wordGroupsDict[groupName].isOn) {
				wordGroupsDict[groupName].words.forEach(function (word) {
					highlightWordFunction(word, groupName);
				});
			}
		});
	};

	// watch if any table change its content (often by ajax), then re-highlight words
	var observer = new MutationObserver(function(mutations) {
	    chrome.storage.sync.get('wordGroupsDict', function (wordGroupsDict) {
			if (!wordGroupsDict.wordGroupsDict) return;
			else wordGroupsDict = wordGroupsDict.wordGroupsDict;
		 	highlightAllWords(wordGroupsDict);
		});
	});
	$("table").each(function(){
	  	observer.observe($(this)[0], { childList: true});
	});

	$(window).load(function(){
		// get words from storage
		chrome.storage.sync.get('wordGroupsDict', function (wordGroupsDict) {

			if (!wordGroupsDict.wordGroupsDict) return;
			else wordGroupsDict = wordGroupsDict.wordGroupsDict;
		 	highlightAllWords(wordGroupsDict);
			// body may not loaded... hard-code some delay
			// setTimeout(highlightAllWords, 500, wordGroupsDict);

			// may use observer to due with it
			// var observer = new MutationObserver(function(mutations) {
			// 	mutations.forEach(function(mutation) {
			// 		console.log(mutation);
			// 	});
			// })
			// var minConfig = { attributes: true, childList: true, characterData: true };
			// minConfig.subtree = true;
			// observer.observe(document.body, minConfig);
		});
	});

	// on word list change
	chrome.runtime.onMessage.addListener(function (messageBody, sender, sendResponse) {

		// console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");

		// remove all highlight first
		[].slice.call(document.getElementsByClassName("chrome-extension-highlight")).forEach(function (e) {
			var parentNode = e.parentNode;
			while(e.firstChild) parentNode.insertBefore(e.firstChild, e);
			parentNode.removeChild(e);
		});

		highlightAllWords(messageBody);
		if (sendResponse) sendResponse({content: "highlight done!"});
	});
}();
