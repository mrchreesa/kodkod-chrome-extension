/// <reference types="chrome" />

// Inline dev logger (service worker — separate bundle, cannot import shared debug.ts)
const isDev = import.meta.env.DEV;
function bgLog(msg: string, data?: unknown) {
  if (!isDev) return;
  console.log(`%c[KodKod:FILL_DEBUGGER]%c ${msg}`, 'color:#f97316;font-weight:bold', 'color:inherit', ...(data !== undefined ? [data] : []));
}
function bgWarn(msg: string, data?: unknown) {
  if (!isDev) return;
  console.warn(`%c[KodKod:FILL_DEBUGGER]%c ${msg}`, 'color:#f97316;font-weight:bold', 'color:inherit', ...(data !== undefined ? [data] : []));
}

bgLog('Background service worker running');

// Open side panel on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => bgWarn('Failed to set panel behavior:', error));

// ============================================
// CHROME DEBUGGER API - DROPDOWN AUTOMATION
// ============================================

// Types for debugger automation (used internally)
// interface DebuggerTarget { tabId: number; }
// interface ElementInfo { selector: string; x: number; y: number; width: number; height: number; }

// Track attached debuggers to avoid re-attaching
const attachedTabs = new Set<number>();

// Attach debugger to tab
async function attachDebugger(tabId: number): Promise<boolean> {
  if (attachedTabs.has(tabId)) {
    bgLog(`Debugger already attached to tab ${tabId}`);
    return true;
  }

  return new Promise((resolve) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        bgWarn('Failed to attach debugger:', chrome.runtime.lastError.message);
        resolve(false);
      } else {
        attachedTabs.add(tabId);
        bgLog(`Debugger attached to tab ${tabId}`);
        resolve(true);
      }
    });
  });
}

// Detach debugger from tab
async function detachDebugger(tabId: number): Promise<void> {
  if (!attachedTabs.has(tabId)) return;

  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => {
      attachedTabs.delete(tabId);
      if (chrome.runtime.lastError) {
        bgWarn('Failed to detach debugger:', chrome.runtime.lastError.message);
      } else {
        bgLog(`Debugger detached from tab ${tabId}`);
      }
      resolve();
    });
  });
}

// Send CDP command
async function sendCommand<T>(tabId: number, method: string, params?: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result as T);
      }
    });
  });
}

// Get element position using CDP
async function getElementPosition(
  tabId: number,
  selector: string
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    // Get document
    const doc = await sendCommand<{ root: { nodeId: number } }>(tabId, 'DOM.getDocument');
    
    // Query selector
    const nodeResult = await sendCommand<{ nodeId: number }>(tabId, 'DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: selector,
    });

    if (!nodeResult.nodeId) {
      bgWarn(`Element not found: ${selector}`);
      return null;
    }

    // Scroll element into view (ensures correct viewport-relative coords)
    try {
      await sendCommand(tabId, 'DOM.scrollIntoViewIfNeeded', { nodeId: nodeResult.nodeId });
      await new Promise((r) => setTimeout(r, 100));
    } catch { /* older Chrome versions may not support this */ }

    // Get box model
    const boxModel = await sendCommand<{
      model: {
        content: number[];
        border: number[];
      };
    }>(tabId, 'DOM.getBoxModel', { nodeId: nodeResult.nodeId });

    if (!boxModel.model) {
      bgWarn(`Could not get box model for: ${selector}`);
      return null;
    }

    // content array: [x1,y1, x2,y2, x3,y3, x4,y4] (4 corners)
    const content = boxModel.model.content;
    const x = content[0];
    const y = content[1];
    const width = content[2] - content[0];
    const height = content[5] - content[1];

    return { x, y, width, height };
  } catch (err) {
    bgWarn('Error getting element position:', err);
    return null;
  }
}

// Click at coordinates using CDP
async function clickAtPosition(
  tabId: number,
  x: number,
  y: number
): Promise<boolean> {
  try {
    // Mouse pressed
    await sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });

    // Small delay
    await new Promise((r) => setTimeout(r, 50));

    // Mouse released
    await sendCommand(tabId, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });

    return true;
  } catch (err) {
    bgWarn('Error clicking:', err);
    return false;
  }
}

// Type text using CDP
async function typeText(tabId: number, text: string): Promise<boolean> {
  try {
    for (const char of text) {
      await sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char,
      });
      await sendCommand(tabId, 'Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: char,
      });
      // Small delay between characters
      await new Promise((r) => setTimeout(r, 10));
    }
    return true;
  } catch (err) {
    bgWarn('Error typing:', err);
    return false;
  }
}

// Press key using CDP
async function pressKey(tabId: number, key: string, keyCode?: number): Promise<boolean> {
  try {
    const keyCodeMap: Record<string, number> = {
      'Enter': 13,
      'ArrowDown': 40,
      'ArrowUp': 38,
      'Escape': 27,
      'Tab': 9,
      'Backspace': 8,
    };

    const code = keyCode || keyCodeMap[key] || key.charCodeAt(0);

    await sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code: key,
      windowsVirtualKeyCode: code,
      nativeVirtualKeyCode: code,
    });

    await new Promise((r) => setTimeout(r, 50));

    await sendCommand(tabId, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code: key,
      windowsVirtualKeyCode: code,
      nativeVirtualKeyCode: code,
    });

    return true;
  } catch (err) {
    bgWarn(`Error pressing ${key}:`, err);
    return false;
  }
}

// Click element by selector
async function clickElement(tabId: number, selector: string): Promise<boolean> {
  const pos = await getElementPosition(tabId, selector);
  if (!pos) return false;

  // Click center of element
  const centerX = pos.x + pos.width / 2;
  const centerY = pos.y + pos.height / 2;

  return clickAtPosition(tabId, centerX, centerY);
}

// Select dropdown value using CDP
// Strategy: click to open → find matching [role="option"] via DOM → click it.
// Fallback: type text + Enter (for searchable comboboxes).
async function selectDropdownValue(
  tabId: number,
  dropdownSelector: string,
  optionText: string
): Promise<{ success: boolean; method: string; error?: string }> {
  try {
    const attached = await attachDebugger(tabId);
    if (!attached) {
      return { success: false, method: 'none', error: 'Failed to attach debugger' };
    }

    bgLog(`Selecting "${optionText}" from ${dropdownSelector}`);

    // Click the dropdown to open it
    const clicked = await clickElement(tabId, dropdownSelector);
    if (!clicked) {
      return { success: false, method: 'click', error: 'Failed to click dropdown' };
    }

    // Wait for listbox to render
    await new Promise((r) => setTimeout(r, 400));

    // --- Strategy 1: Find and click the matching [role="option"] element ---
    try {
      const doc = await sendCommand<{ root: { nodeId: number } }>(tabId, 'DOM.getDocument');
      const optionsResult = await sendCommand<{ nodeIds: number[] }>(tabId, 'DOM.querySelectorAll', {
        nodeId: doc.root.nodeId,
        selector: '[role="option"]',
      });

      if (optionsResult.nodeIds && optionsResult.nodeIds.length > 0) {
        bgLog(`Found ${optionsResult.nodeIds.length} [role="option"] elements`);
        const targetLower = optionText.toLowerCase().trim();
        let matchedNodeId: number | null = null;
        let matchedText = '';

        for (const nodeId of optionsResult.nodeIds) {
          try {
            const html = await sendCommand<{ outerHTML: string }>(tabId, 'DOM.getOuterHTML', { nodeId });
            const text = html.outerHTML.replace(/<[^>]*>/g, '').trim();
            const textLower = text.toLowerCase();

            if (textLower === targetLower) {
              matchedNodeId = nodeId;
              matchedText = text;
              break;
            }
            // Partial/contains match as fallback
            if (!matchedNodeId && (textLower.includes(targetLower) || targetLower.includes(textLower))) {
              matchedNodeId = nodeId;
              matchedText = text;
            }
          } catch { /* skip unreadable nodes */ }
        }

        if (matchedNodeId) {
          // Scroll the option into view first
          try {
            await sendCommand(tabId, 'DOM.scrollIntoViewIfNeeded', { nodeId: matchedNodeId });
            await new Promise((r) => setTimeout(r, 100));
          } catch { /* ignore */ }

          const boxModel = await sendCommand<{ model: { content: number[] } }>(tabId, 'DOM.getBoxModel', { nodeId: matchedNodeId });
          if (boxModel.model) {
            const c = boxModel.model.content;
            const centerX = c[0] + (c[2] - c[0]) / 2;
            const centerY = c[1] + (c[5] - c[1]) / 2;
            bgLog(`Option "${matchedText}" at (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);

            const clickedOption = await clickAtPosition(tabId, centerX, centerY);
            if (clickedOption) {
              bgLog(`Clicked option "${matchedText}" for "${optionText}"`);
              await new Promise((r) => setTimeout(r, 300));
              return { success: true, method: 'option-click' };
            } else {
              bgWarn(`Click at (${centerX.toFixed(0)}, ${centerY.toFixed(0)}) failed for "${matchedText}"`);
            }
          } else {
            bgWarn(`No box model for matched option node`);
          }
        } else {
          bgWarn(`No [role="option"] matched "${optionText}"`);
        }
      }
    } catch (domErr) {
      bgWarn('DOM option-click strategy failed, trying keyboard fallback:', domErr);
    }

    // --- Strategy 2 (fallback): Type text + Enter (searchable comboboxes) ---
    bgLog(`Falling back to keyboard-type for "${optionText}"`);
    await typeText(tabId, optionText);
    await new Promise((r) => setTimeout(r, 200));
    await pressKey(tabId, 'Enter');
    await new Promise((r) => setTimeout(r, 100));

    return { success: true, method: 'keyboard-type' };
  } catch (err) {
    bgWarn('Error selecting dropdown:', err);
    return { success: false, method: 'error', error: String(err) };
  }
}

// Select dropdown by clicking option directly (for non-searchable dropdowns)
// This is an alternative strategy available for future use
/*
async function selectDropdownByClick(
  tabId: number,
  dropdownSelector: string,
  optionSelector: string
): Promise<{ success: boolean; method: string; error?: string }> {
  try {
    const attached = await attachDebugger(tabId);
    if (!attached) {
      return { success: false, method: 'none', error: 'Failed to attach debugger' };
    }

    // Click dropdown to open
    const clickedDropdown = await clickElement(tabId, dropdownSelector);
    if (!clickedDropdown) {
      return { success: false, method: 'click', error: 'Failed to click dropdown' };
    }

    // Wait for options to appear
    await new Promise((r) => setTimeout(r, 300));

    // Click the option
    const clickedOption = await clickElement(tabId, optionSelector);
    if (!clickedOption) {
      // Try arrow keys + Enter as fallback
      await pressKey(tabId, 'ArrowDown');
      await new Promise((r) => setTimeout(r, 100));
      await pressKey(tabId, 'Enter');
      return { success: true, method: 'arrow-enter' };
    }

    return { success: true, method: 'direct-click' };
  } catch (err) {
    return { success: false, method: 'error', error: String(err) };
  }
}
*/

// Select Yes/No dropdowns (common pattern)
async function selectYesNo(
  tabId: number,
  dropdownSelector: string,
  value: 'yes' | 'no'
): Promise<{ success: boolean; method: string; error?: string }> {
  try {
    const attached = await attachDebugger(tabId);
    if (!attached) {
      return { success: false, method: 'none', error: 'Failed to attach debugger' };
    }

    // Click dropdown
    await clickElement(tabId, dropdownSelector);
    await new Promise((r) => setTimeout(r, 300));

    // Arrow down to get to options, then navigate
    if (value === 'yes') {
      await pressKey(tabId, 'ArrowDown'); // First option usually "Yes"
    } else {
      await pressKey(tabId, 'ArrowDown');
      await new Promise((r) => setTimeout(r, 50));
      await pressKey(tabId, 'ArrowDown'); // Second option usually "No"
    }

    await new Promise((r) => setTimeout(r, 100));
    await pressKey(tabId, 'Enter');

    return { success: true, method: 'arrow-navigation' };
  } catch (err) {
    return { success: false, method: 'error', error: String(err) };
  }
}

// Fill form using debugger (handles complex dropdowns)
async function fillFormWithDebugger(
  tabId: number,
  fields: { selector: string; value: string; type: string }[]
): Promise<{ filled: number; failed: number; results: { selector: string; success: boolean; method?: string }[] }> {
  const results: { selector: string; success: boolean; method?: string }[] = [];
  let filled = 0;
  let failed = 0;

  const attached = await attachDebugger(tabId);
  if (!attached) {
    return {
      filled: 0,
      failed: fields.length,
      results: fields.map((f) => ({ selector: f.selector, success: false, method: 'debugger-attach-failed' })),
    };
  }

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    let success = false;
    let method = 'unknown';

    bgLog(`[${i + 1}/${fields.length}] Filling ${field.type} "${field.value.slice(0, 30)}" → ${field.selector}`);

    try {
      // Close any stale popups/listboxes before starting the next field
      if (i > 0) {
        await pressKey(tabId, 'Escape');
        await new Promise((r) => setTimeout(r, 300));
      }

      if (field.type === 'combobox' || field.type === 'select' || field.type === 'dropdown') {
        const result = await selectDropdownValue(tabId, field.selector, field.value);
        success = result.success;
        method = result.method;
      } else if (field.type === 'yesno') {
        const result = await selectYesNo(tabId, field.selector, field.value.toLowerCase() as 'yes' | 'no');
        success = result.success;
        method = result.method;
      } else {
        // Text fields: click and type
        await clickElement(tabId, field.selector);
        await new Promise((r) => setTimeout(r, 100));

        // Clear existing text
        await pressKey(tabId, 'a', 65);

        success = await typeText(tabId, field.value);
        method = 'type';
      }
    } catch (err) {
      bgWarn(`Error filling ${field.selector}:`, err);
      method = 'error';
    }

    bgLog(`[${i + 1}/${fields.length}] ${success ? 'OK' : 'FAIL'} (method=${method})`);
    results.push({ selector: field.selector, success, method });
    if (success) filled++;
    else failed++;

    // Longer delay between fields — Workday needs time for React re-renders
    await new Promise((r) => setTimeout(r, 600));
  }

  bgLog(`Debugger fill complete: ${filled} filled, ${failed} failed`);
  return { filled, failed, results };
}

// Handle cleanup when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (attachedTabs.has(tabId)) {
    attachedTabs.delete(tabId);
    bgLog(`Tab ${tabId} closed, removed from attached tabs`);
  }
});

// Handle debugger detach events
chrome.debugger.onDetach.addListener((source, reason) => {
  if (source.tabId) {
    attachedTabs.delete(source.tabId);
    bgLog(`Debugger detached from tab ${source.tabId}, reason: ${reason}`);
  }
});

// Message handler for dropdown automation requests
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'debugger_selectDropdown') {
    const { tabId, selector, value } = request;
    selectDropdownValue(tabId, selector, value).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'debugger_selectYesNo') {
    const { tabId, selector, value } = request;
    selectYesNo(tabId, selector, value).then(sendResponse);
    return true;
  }

  if (request.action === 'debugger_fillForm') {
    const { tabId, fields } = request;
    fillFormWithDebugger(tabId, fields).then(sendResponse);
    return true;
  }

  if (request.action === 'debugger_clickElement') {
    const { tabId, selector } = request;
    (async () => {
      const attached = await attachDebugger(tabId);
      if (!attached) {
        sendResponse({ success: false, error: 'Failed to attach debugger' });
        return;
      }
      const success = await clickElement(tabId, selector);
      sendResponse({ success });
    })();
    return true;
  }

  if (request.action === 'debugger_typeText') {
    const { tabId, text } = request;
    (async () => {
      const attached = await attachDebugger(tabId);
      if (!attached) {
        sendResponse({ success: false, error: 'Failed to attach debugger' });
        return;
      }
      const success = await typeText(tabId, text);
      sendResponse({ success });
    })();
    return true;
  }

  if (request.action === 'debugger_detach') {
    const { tabId } = request;
    detachDebugger(tabId).then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'debugger_getStatus') {
    const { tabId } = request;
    sendResponse({ attached: attachedTabs.has(tabId) });
    return false;
  }
});

bgLog('Debugger automation ready');
