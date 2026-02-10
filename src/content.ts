/// <reference types="chrome" />
console.log('KodKod Content Script loaded')

// Job board configurations with specific selectors
interface JobBoardConfig {
  name: string;
  hostPatterns: RegExp[];
  selectors: string[];
  removeSelectors?: string[];
  customExtract?: () => string | null;
}

const jobBoardConfigs: JobBoardConfig[] = [
  {
    name: 'LinkedIn',
    hostPatterns: [/linkedin\.com/],
    selectors: [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.job-details-jobs-unified-top-card__job-insight',
      '[data-job-id] .jobs-description',
      '.jobs-unified-top-card__job-insight',
      '.description__text',
    ],
    removeSelectors: [
      '.jobs-description__footer',
      '.premium-upsell',
    ],
  },
  {
    name: 'Indeed',
    hostPatterns: [/indeed\.com/],
    selectors: [
      '#jobDescriptionText',
      '.jobsearch-JobComponent-description',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobDescriptionText"]',
      '.job-description',
    ],
  },
  {
    name: 'Glassdoor',
    hostPatterns: [/glassdoor\.com/],
    selectors: [
      '.jobDescriptionContent',
      '[data-test="jobDescriptionContent"]',
      '.desc',
      '.jobDescription',
      '#JobDescriptionContainer',
    ],
  },
  {
    name: 'Greenhouse',
    hostPatterns: [/greenhouse\.io/, /boards\.greenhouse\.io/],
    selectors: [
      '#content',
      '.job__description',
      '.job-post-description',
      '#job_content',
      '.job-description',
    ],
    removeSelectors: [
      '.job__apply',
      '#apply_button',
    ],
  },
  {
    name: 'Lever',
    hostPatterns: [/lever\.co/, /jobs\.lever\.co/],
    selectors: [
      '.section-wrapper.page-full-width',
      '.posting-page',
      '[data-qa="job-description"]',
      '.posting-requirements',
      '.content',
    ],
    removeSelectors: [
      '.posting-apply',
      '.apply-button',
    ],
  },
  {
    name: 'Workday',
    hostPatterns: [/myworkdayjobs\.com/, /wd\d+\.myworkday\.com/],
    selectors: [
      '[data-automation-id="jobPostingDescription"]',
      '.job-description',
      '[data-automation-id="job-posting-details"]',
      '.css-cygeeu',
    ],
  },
  {
    name: 'ZipRecruiter',
    hostPatterns: [/ziprecruiter\.com/],
    selectors: [
      '.job_description',
      '.jobDescriptionSection',
      '[data-testid="job-description"]',
      '.job-details-description',
    ],
  },
  {
    name: 'Monster',
    hostPatterns: [/monster\.com/],
    selectors: [
      '.job-description',
      '#JobDescription',
      '.job-details__body',
      '[data-testid="jobDescription"]',
    ],
  },
  {
    name: 'Wellfound (AngelList)',
    hostPatterns: [/wellfound\.com/, /angel\.co/],
    selectors: [
      '.job-description',
      '[data-test="JobDescription"]',
      '.styles_description__',
      '.description',
    ],
  },
  {
    name: 'CareerBuilder',
    hostPatterns: [/careerbuilder\.com/],
    selectors: [
      '.job-description',
      '#job-description',
      '.description',
    ],
  },
  {
    name: 'SmartRecruiters',
    hostPatterns: [/smartrecruiters\.com/, /jobs\.smartrecruiters\.com/],
    selectors: [
      '.job-sections',
      '.job-description',
      '[data-testid="job-description"]',
    ],
  },
  {
    name: 'Ashby',
    hostPatterns: [/ashbyhq\.com/, /jobs\.ashbyhq\.com/],
    selectors: [
      '.ashby-job-posting-description',
      '[data-testid="job-description"]',
      '.job-description',
    ],
  },
  {
    name: 'SuccessFactors',
    hostPatterns: [/successfactors\.eu/, /successfactors\.com/],
    selectors: [
      '.job-description',
      '.jobReqDescription',
      '[data-automation-id="jobDescriptionText"]',
    ],
  },
];

// Detect which job board we're on
function detectJobBoard(): JobBoardConfig | null {
  const hostname = window.location.hostname;
  for (const config of jobBoardConfigs) {
    for (const pattern of config.hostPatterns) {
      if (pattern.test(hostname)) {
        console.log(`KodKod: Detected ${config.name}`);
        return config;
      }
    }
  }
  return null;
}

// Extract text from elements matching selectors
function extractFromSelectors(selectors: string[], removeSelectors?: string[]): string | null {
  const hiddenElements: { element: HTMLElement; originalDisplay: string }[] = [];

  if (removeSelectors) {
    removeSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el instanceof HTMLElement) {
          hiddenElements.push({ element: el, originalDisplay: el.style.display });
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });
  }

  let result: string | null = null;

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      const texts: string[] = [];
      elements.forEach(el => {
        if (el instanceof HTMLElement && el.innerText.trim()) {
          texts.push(el.innerText.trim());
        }
      });
      if (texts.length > 0) {
        result = texts.join('\n\n');
        break;
      }
    }
  }

  hiddenElements.forEach(({ element, originalDisplay }) => {
    if (originalDisplay) {
      element.style.display = originalDisplay;
    } else {
      element.style.removeProperty('display');
    }
  });

  return result;
}

// Generic fallback scraping
function genericScrape(): string {
  // First, try to find main content areas
  const contentSelectors = [
    'main', 'article', '[role="main"]',
    '.job-description', '.job-content', '.job-details',
    '.content', '.post-content', '.entry-content',
    '#content', '#main', '#main-content',
  ];
  
  for (const selector of contentSelectors) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement && el.innerText.trim().length > 200) {
      return el.innerText.trim();
    }
  }

  // Fallback: hide non-content elements and get body text
  const selectorsToHide = [
    'header', 'footer', 'nav', 'iframe', 'script', 'style', 'noscript',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '[role="dialog"]', '[role="alertdialog"]',
    '#sidebar', '.sidebar', '#menu', '.menu',
    '.ad', '.ads', '.advertisement',
    '.cookie-banner', '#cookie-banner', '.cookie-consent', '#cookie-consent',
    '.modal', '.popup', '.notification', '.toast',
    '[class*="cookie"]', '[id*="cookie"]',
    '.grecaptcha-badge', '[class*="recaptcha"]',
  ];

  const elementsToHide: { element: HTMLElement; originalDisplay: string }[] = [];

  selectorsToHide.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (el instanceof HTMLElement) {
        elementsToHide.push({ element: el, originalDisplay: el.style.display });
        el.style.setProperty('display', 'none', 'important');
      }
    });
  });

  const bodyText = document.body.innerText;

  elementsToHide.forEach(({ element, originalDisplay }) => {
    if (originalDisplay) {
      element.style.display = originalDisplay;
    } else {
      element.style.removeProperty('display');
    }
  });

  return bodyText;
}

// Clean up extracted text
function cleanText(text: string): string {
  return text
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .trim();
}

// Main scrape function
function scrapeJobDescription(): { content: string; source: string } {
  const jobBoard = detectJobBoard();

  if (jobBoard) {
    if (jobBoard.customExtract) {
      const content = jobBoard.customExtract();
      if (content) {
        return { content: cleanText(content), source: jobBoard.name };
      }
    }

    const content = extractFromSelectors(jobBoard.selectors, jobBoard.removeSelectors);
    if (content && content.length > 100) {
      return { content: cleanText(content), source: jobBoard.name };
    }

    console.log(`KodKod: ${jobBoard.name} selectors didn't match, falling back to generic`);
  }

  return { content: cleanText(genericScrape()), source: 'generic' };
}

// ============================================
// APPLICATION FORM AUTO-FILL FUNCTIONALITY
// ============================================

interface ApplicationPlatformConfig {
  name: string;
  hostPatterns: RegExp[];
  applicationUrlPatterns: RegExp[];
  formContainerSelectors: string[];
}

const applicationPlatforms: ApplicationPlatformConfig[] = [
  {
    name: 'Workday',
    hostPatterns: [/myworkdayjobs\.com/, /wd\d+\.myworkday\.com/],
    applicationUrlPatterns: [/\/apply/, /\/applyManually/],
    formContainerSelectors: ['[data-automation-id="formContainer"]', 'form'],
  },
  {
    name: 'SuccessFactors',
    hostPatterns: [/successfactors\.eu/, /successfactors\.com/],
    applicationUrlPatterns: [/\/apply/, /\/career/],
    formContainerSelectors: ['.application-form', 'form'],
  },
  {
    name: 'Greenhouse',
    hostPatterns: [/greenhouse\.io/, /boards\.greenhouse\.io/],
    applicationUrlPatterns: [/\/applications\//, /\#app/],
    formContainerSelectors: ['#application_form', '.application-form', 'form'],
  },
  {
    name: 'Lever',
    hostPatterns: [/lever\.co/, /jobs\.lever\.co/],
    applicationUrlPatterns: [/\/apply/],
    formContainerSelectors: ['.application-form', 'form'],
  },
  {
    name: 'SmartRecruiters',
    hostPatterns: [/smartrecruiters\.com/],
    applicationUrlPatterns: [/\/apply/],
    formContainerSelectors: ['.application-form', 'form'],
  },
];

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string; // 'text', 'textarea', 'radio', 'checkbox', 'email', 'tel', 'combobox', etc.
  options?: { value: string; text: string }[]; // For radio buttons and comboboxes
  required: boolean;
  placeholder?: string;
  currentValue?: string;
  selector?: string;
  buttonSelector?: string; // For ARIA combobox trigger buttons
  needsDebugger?: boolean; // Flag for complex dropdowns that need debugger API
}

// Detect if we're on a known application platform
function detectApplicationPlatform(): ApplicationPlatformConfig | null {
  const hostname = window.location.hostname;
  const url = window.location.href;

  for (const platform of applicationPlatforms) {
    const hostnameMatch = platform.hostPatterns.some(pattern => pattern.test(hostname));
    if (!hostnameMatch) continue;

    const urlMatch = platform.applicationUrlPatterns.some(pattern => pattern.test(url));
    if (urlMatch) {
      console.log(`KodKod: Detected application form on ${platform.name}`);
      return platform;
    }
  }
  return null;
}

// Check if page has fillable form fields
function hasFormFields(): boolean {
  const inputs = document.querySelectorAll('input, textarea');
  let fillableCount = 0;
  
  inputs.forEach((element) => {
    const el = element as HTMLInputElement | HTMLTextAreaElement;
    const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
    
    // Skip non-fillable types
    if (['hidden', 'submit', 'button', 'reset', 'image', 'file'].includes(type)) return;
    
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    
    fillableCount++;
  });
  
  return fillableCount >= 3;
}

// Get the closest label for an input element
function getLabelForInput(input: HTMLElement): string {
  // 1. Check for explicit label via 'for' attribute
  const id = input.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label && label.textContent) {
      return label.textContent.trim();
    }
  }

  // 2. Check for aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // 3. Check for aria-labelledby
  const ariaLabelledBy = input.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelEl = document.getElementById(ariaLabelledBy);
    if (labelEl && labelEl.textContent) {
      return labelEl.textContent.trim();
    }
  }

  // 4. Check parent label element
  const parentLabel = input.closest('label');
  if (parentLabel && parentLabel.textContent) {
    let labelText = parentLabel.textContent.trim();
    if (input instanceof HTMLInputElement && input.value) {
      labelText = labelText.replace(input.value, '').trim();
    }
    return labelText;
  }

  // 5. Check for preceding label sibling
  let sibling = input.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === 'LABEL' && sibling.textContent) {
      return sibling.textContent.trim();
    }
    sibling = sibling.previousElementSibling;
  }

  // 6. Check for label in parent container
  const container = input.closest('.form-group, .field, .input-group, [class*="field"], [class*="form"]');
  if (container) {
    const label = container.querySelector('label, .label, [class*="label"]');
    if (label && label.textContent) {
      return label.textContent.trim();
    }
  }

  // 7. Check placeholder
  const placeholder = input.getAttribute('placeholder');
  if (placeholder) return placeholder;

  // 8. Use name attribute as fallback
  const name = input.getAttribute('name');
  if (name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return '';
}

// Generate a CSS selector for an element
function generateSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
  
  const dataAttrs = ['data-automation-id', 'data-testid', 'data-qa'];
  for (const attr of dataAttrs) {
    const val = el.getAttribute(attr);
    if (val) return `[${attr}="${val}"]`;
  }
  
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
    const index = siblings.indexOf(el);
    if (index >= 0) {
      const parentSelector = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase();
      return `${parentSelector} > ${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }
  }
  
  return el.tagName.toLowerCase();
}

// Get radio options with value and text
function getRadioOptions(name: string): { value: string; text: string }[] {
  const options: { value: string; text: string }[] = [];
  const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
  radios.forEach(radio => {
    const radioEl = radio as HTMLInputElement;
    const label = getLabelForInput(radioEl);
    if (label) {
      options.push({ value: radioEl.value, text: label });
    }
  });
  return options;
}

// Detect ARIA combobox options by opening and reading listbox
function getComboboxOptions(combobox: HTMLElement): { value: string; text: string }[] {
  const options: { value: string; text: string }[] = [];
  
  // Check aria-controls for the listbox ID
  const listboxId = combobox.getAttribute('aria-controls') || combobox.getAttribute('aria-owns');
  let listbox: HTMLElement | null = null;
  
  if (listboxId) {
    listbox = document.getElementById(listboxId);
  }
  
  // Also look for adjacent listbox
  if (!listbox) {
    listbox = combobox.parentElement?.querySelector('[role="listbox"]') || null;
  }
  
  if (listbox) {
    const optionElements = listbox.querySelectorAll('[role="option"]');
    optionElements.forEach((opt) => {
      const text = opt.textContent?.trim() || '';
      const value = opt.getAttribute('data-value') || opt.getAttribute('id') || text;
      if (text) {
        options.push({ value, text });
      }
    });
  }
  
  return options;
}

// Find the trigger button for an ARIA combobox
function findComboboxButton(combobox: HTMLElement): HTMLElement | null {
  // Check for button inside or adjacent to combobox
  const internalButton = combobox.querySelector('button, [role="button"]');
  if (internalButton) return internalButton as HTMLElement;
  
  // Check if combobox itself is clickable
  if (combobox.getAttribute('tabindex') !== null || combobox.tagName === 'BUTTON') {
    return combobox;
  }
  
  // Look for adjacent button
  const nextButton = combobox.nextElementSibling;
  if (nextButton && (nextButton.tagName === 'BUTTON' || nextButton.getAttribute('role') === 'button')) {
    return nextButton as HTMLElement;
  }
  
  // Parent might have the button
  const parentButton = combobox.parentElement?.querySelector('button, [role="button"]');
  if (parentButton) return parentButton as HTMLElement;
  
  return combobox; // Fall back to clicking the combobox itself
}

// Scrape all form fields from the page (TEXT + RADIO + COMBOBOX)
function scrapeFormFields(): { fields: FormField[]; platform: string | null } {
  const platform = detectApplicationPlatform();
  const fields: FormField[] = [];
  const processedNames = new Set<string>();
  const comboboxElements = new Set<HTMLElement>(); // Track combobox containers to skip their inputs

  // PASS 1: Find all ARIA comboboxes first
  const comboboxes = document.querySelectorAll('[role="combobox"]');
  comboboxes.forEach((element, index) => {
    const el = element as HTMLElement;
    
    // Skip invisible
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    
    // Mark this element and its children so we skip their inputs
    comboboxElements.add(el);
    
    const label = getLabelForInput(el);
    const fieldId = el.id || `combobox_${index}`;
    const triggerButton = findComboboxButton(el);
    const currentValue = el.textContent?.trim() || el.getAttribute('aria-label') || '';
    
    // Get options if listbox is visible
    const options = getComboboxOptions(el);
    
    // Detect if this is a simple Yes/No dropdown
    const isYesNo = options.length === 2 && 
      options.some(o => o.text.toLowerCase() === 'yes') && 
      options.some(o => o.text.toLowerCase() === 'no');
    
    const field: FormField = {
      id: fieldId,
      name: el.getAttribute('name') || '',
      label: label || 'Dropdown',
      type: isYesNo ? 'yesno' : 'combobox',
      required: el.getAttribute('aria-required') === 'true',
      currentValue: currentValue || undefined,
      selector: generateSelector(el),
      buttonSelector: triggerButton ? generateSelector(triggerButton) : undefined,
      options: options.length > 0 ? options : undefined,
      needsDebugger: true, // Flag that this needs debugger API
    };
    
    fields.push(field);
    console.log(`KodKod: Found combobox "${label}" with ${options.length} options`);
  });

  // PASS 2: Find text inputs, textareas, and radio buttons (skip those inside comboboxes)
  const inputs = document.querySelectorAll('input, textarea');

  inputs.forEach((element, index) => {
    const el = element as HTMLInputElement | HTMLTextAreaElement;
    
    // Skip inputs inside comboboxes
    for (const cb of comboboxElements) {
      if (cb.contains(el)) return;
    }
    
    const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
    
    // Only process text-like inputs and radio buttons
    const allowedTypes = ['text', 'email', 'tel', 'url', 'number', 'textarea', 'radio'];
    if (!allowedTypes.includes(type) && el.tagName !== 'TEXTAREA') return;
    
    // Skip invisible
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    
    const fieldId = el.id || el.name || `field_${index}`;
    
    // Skip duplicate radio buttons (group by name)
    if (type === 'radio') {
      if (processedNames.has((el as HTMLInputElement).name)) return;
      processedNames.add((el as HTMLInputElement).name);
    }
    
    const label = getLabelForInput(el);
    if (!label && !['email', 'tel'].includes(type)) return;
    
    const field: FormField = {
      id: fieldId,
      name: el.name || '',
      label: label || type,
      type: el.tagName === 'TEXTAREA' ? 'textarea' : type,
      required: el.required || el.getAttribute('aria-required') === 'true',
      placeholder: (el as HTMLInputElement).placeholder || undefined,
      currentValue: el.value || undefined,
      selector: generateSelector(el),
      needsDebugger: false,
    };
    
    // Get options for radio buttons
    if (type === 'radio' && (el as HTMLInputElement).name) {
      field.options = getRadioOptions((el as HTMLInputElement).name);
    }
    
    fields.push(field);
  });

  console.log(`KodKod: Scraped ${fields.length} form fields (text + radio + combobox)`);
  return { fields, platform: platform?.name || null };
}

// Capture current form values (for learning)
function captureFormValues(): Record<string, { label: string; value: string; type: string; options?: { value: string; text: string }[] }> {
  const values: Record<string, { label: string; value: string; type: string; options?: { value: string; text: string }[] }> = {};
  const processedNames = new Set<string>();
  
  const inputs = document.querySelectorAll('input, textarea');
  
  inputs.forEach((element, index) => {
    const el = element as HTMLInputElement | HTMLTextAreaElement;
    const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
    
    // Only process text-like inputs and radio buttons
    const allowedTypes = ['text', 'email', 'tel', 'url', 'number', 'textarea', 'radio'];
    if (!allowedTypes.includes(type) && el.tagName !== 'TEXTAREA') return;
    
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    
    const fieldId = el.id || el.name || `field_${index}`;
    
    if (type === 'radio') {
      if (processedNames.has((el as HTMLInputElement).name)) return;
      processedNames.add((el as HTMLInputElement).name);
      
      // Find selected radio
      const selected = document.querySelector(`input[type="radio"][name="${(el as HTMLInputElement).name}"]:checked`) as HTMLInputElement;
      if (selected) {
        values[fieldId] = {
          label: getLabelForInput(el),
          value: getLabelForInput(selected),
          type: 'radio',
          options: getRadioOptions((el as HTMLInputElement).name)
        };
      }
      return;
    }
    
    const label = getLabelForInput(el);
    if (!label && !['email', 'tel'].includes(type)) return;
    
    if (el.value) {
      values[fieldId] = {
        label: label || type,
        value: el.value,
        type: el.tagName === 'TEXTAREA' ? 'textarea' : type,
      };
    }
  });
  
  return values;
}

// Fill a single form field
function fillFormField(fieldId: string, value: string): boolean {
  let element = document.getElementById(fieldId) as HTMLElement | null;
  if (!element) {
    element = document.querySelector(`[name="${fieldId}"]`) as HTMLElement | null;
  }
  if (!element) return false;
  
  const tagName = element.tagName;
  const type = (element as HTMLInputElement).type?.toLowerCase() || '';
  
  try {
    // Radio buttons
    if (type === 'radio') {
      const radios = document.querySelectorAll(`input[type="radio"][name="${(element as HTMLInputElement).name}"]`);
      const lowerValue = value.toLowerCase();
      for (const radio of radios) {
        const label = getLabelForInput(radio as HTMLElement).toLowerCase();
        if (label.includes(lowerValue) || lowerValue.includes(label) ||
            (radio as HTMLInputElement).value.toLowerCase() === lowerValue) {
          (radio as HTMLInputElement).checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }
    
    // Text inputs and textareas
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      (element as HTMLInputElement).value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    
    return false;
  } catch (err) {
    console.error(`KodKod: Error filling ${fieldId}:`, err);
    return false;
  }
}

// Fill all form fields
function fillFormFields(values: Record<string, string>): { filled: number; failed: number } {
  let filled = 0;
  let failed = 0;
  
  for (const [fieldId, value] of Object.entries(values)) {
    if (!value) continue;
    
    if (fillFormField(fieldId, value)) {
      filled++;
    } else {
      failed++;
    }
  }
  
  console.log(`KodKod: Filled ${filled} fields, ${failed} failed`);
  return { filled, failed };
}

// Get field value by matching question text to labels
function getFieldValueByQuestion(question: string): { found: boolean; value: string; label?: string } {
  if (!question.trim()) {
    return { found: false, value: '' };
  }

  const normalizedQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const questionWords = normalizedQuestion.split(/\s+/);

  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea'
  );

  let bestMatch: { element: HTMLInputElement | HTMLTextAreaElement; label: string; score: number } | null = null;

  for (const input of inputs) {
    let labelText = '';
    
    if (input.id) {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent?.trim() || '';
    }
    
    if (!labelText) {
      const parentLabel = input.closest('label');
      if (parentLabel) labelText = parentLabel.textContent?.trim() || '';
    }
    
    if (!labelText) {
      labelText = input.getAttribute('aria-label') || '';
    }
    
    if (!labelText && 'placeholder' in input) {
      labelText = input.placeholder || '';
    }
    
    if (!labelText) {
      const prev = input.previousElementSibling;
      if (prev && (prev.tagName === 'SPAN' || prev.tagName === 'DIV' || prev.tagName === 'LABEL')) {
        labelText = prev.textContent?.trim() || '';
      }
    }

    if (!labelText) continue;

    const normalizedLabel = labelText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    
    if (normalizedLabel === normalizedQuestion) {
      bestMatch = { element: input, label: labelText, score: 100 };
      break;
    }
    
    const labelWords = normalizedLabel.split(/\s+/);
    const matchingWords = questionWords.filter(w => labelWords.includes(w) || labelWords.some(lw => lw.includes(w) || w.includes(lw)));
    const score = (matchingWords.length / Math.max(questionWords.length, labelWords.length)) * 100;
    
    if (score > 50 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { element: input, label: labelText, score };
    }
  }

  if (bestMatch) {
    return { found: true, value: bestMatch.element.value || '', label: bestMatch.label };
  }

  return { found: false, value: '' };
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener(
  (
    request: { action: string; values?: Record<string, string>; question?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (request.action === 'scrape') {
      const result = scrapeJobDescription();
      console.log(`KodKod: Scraped from ${result.source}, ${result.content.length} chars, isTopFrame: ${window.self === window.top}`);
      // If we're in an iframe with little content, don't respond (let main frame handle it)
      // But if we're the top frame, always respond
      if (window.self === window.top || result.content.length > 200) {
        sendResponse(result);
      } else {
        return false;
      }
    }
    
    if (request.action === 'checkApplicationPage') {
      const platform = detectApplicationPlatform();
      const hasFields = hasFormFields();
      // Only respond if this frame has form fields (allows iframes to respond)
      if (platform !== null || hasFields) {
        sendResponse({ 
          isApplicationPage: true,
          platform: platform?.name || 'Generic Form'
        });
      } else {
        return false;
      }
    }

    if (request.action === 'scrapeFormFields') {
      const result = scrapeFormFields();
      // Only respond if we found fields (allows other frames to respond if this one is empty)
      if (result.fields.length > 0) {
        sendResponse(result);
      } else {
        // Don't respond - let other frames (iframes) respond instead
        return false;
      }
    }

    if (request.action === 'fillForm') {
      if (request.values) {
        const result = fillFormFields(request.values);
        sendResponse(result);
      } else {
        sendResponse({ error: 'No values provided' });
      }
    }

    if (request.action === 'captureFormValues') {
      const values = captureFormValues();
      sendResponse({ values });
    }

    if (request.action === 'getPageUrl') {
      sendResponse({ url: window.location.href });
    }

    if (request.action === 'getFieldValueByQuestion') {
      const result = getFieldValueByQuestion(request.question || '');
      sendResponse(result);
    }

    // Get info about which fields need debugger-based filling
    if (request.action === 'getDebuggerFields') {
      const { fields } = scrapeFormFields();
      const debuggerFields = fields.filter(f => f.needsDebugger);
      const regularFields = fields.filter(f => !f.needsDebugger);
      sendResponse({ debuggerFields, regularFields });
    }

    return true;
  }
);
