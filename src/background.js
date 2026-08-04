const supportedSites = ['https://www.braceletbook.com/patterns', 'https://www.braceletbook.com/create'];

async function injectScript(tab) {
	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: [ "payload.js" ],
		world: "MAIN"
	}).then(e => console.log(e));
}

async function handleTab(_, changeInfo, tab) {
	if (!changeInfo.url) return;
	if (supportedSites.filter(supportedSite => { return tab.url.startsWith(supportedSite) }).length === 0) return;
	await injectScript(tab);
}

chrome.tabs.onUpdated.addListener(handleTab);

// Debug only
chrome.tabs.query({ active: true, lastFocusedWindow: true }).then( async tabs => {
	return;
	if (supportedSites.filter(supportedSite => { return tabs[0].url.startsWith(supportedSite) }).length === 0) return;
	await chrome.tabs.reload(tabs[0].id);
});