/**
 * MAIN world content script for React-compatible form filling.
 * Runs in the page's JS context so it can bypass React's property overrides.
 */

interface FillRequest {
  id: string;
  selector: string;
  value: string;
  fieldType: string; // 'text', 'textarea', 'select', 'checkbox', etc.
}

interface FillResponse {
  id: string;
  success: boolean;
  error?: string;
}

// Cache native property setters
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value'
)?.set;

const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  'value'
)?.set;

const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
  HTMLSelectElement.prototype,
  'value'
)?.set;

const nativeCheckedSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'checked'
)?.set;

function fillElement(selector: string, value: string, fieldType: string): boolean {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return false;

  try {
    // Focus the element first
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

    if (fieldType === 'checkbox') {
      const shouldCheck = ['yes', 'true', '1', 'on', 'checked'].includes(value.toLowerCase());
      if (nativeCheckedSetter) {
        nativeCheckedSetter.call(el, shouldCheck);
      } else {
        (el as HTMLInputElement).checked = shouldCheck;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el instanceof HTMLSelectElement) {
      if (nativeSelectValueSetter) {
        nativeSelectValueSetter.call(el, value);
      } else {
        el.value = value;
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el instanceof HTMLTextAreaElement) {
      if (nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(el, value);
      } else {
        el.value = value;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el instanceof HTMLInputElement) {
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, value);
      } else {
        el.value = value;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      return false;
    }

    // Blur after setting
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    return true;
  } catch (err) {
    console.error('KodKod MAIN: Error filling element:', err);
    return false;
  }
}

// Listen for fill requests from the ISOLATED world content script
window.addEventListener('kodkod-fill-request', ((event: CustomEvent<FillRequest>) => {
  const { id, selector, value, fieldType } = event.detail;
  const success = fillElement(selector, value, fieldType);
  const response: FillResponse = { id, success };
  if (!success) response.error = 'Element not found or fill failed';
  window.dispatchEvent(new CustomEvent('kodkod-fill-response', { detail: response }));
}) as EventListener);

// Signal that the MAIN world bridge is ready
window.dispatchEvent(new CustomEvent('kodkod-main-world-ready'));
console.log('KodKod: MAIN world bridge established');
