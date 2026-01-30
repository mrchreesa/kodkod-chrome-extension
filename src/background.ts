/// <reference types="chrome" />
console.log('KodKod Background Service Worker running')

// Open side panel on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => console.error(error));
