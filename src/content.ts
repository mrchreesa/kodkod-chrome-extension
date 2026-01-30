/// <reference types="chrome" />
console.log('KodKod Content Script loaded')

// Job board configurations with specific selectors
interface JobBoardConfig {
  name: string;
  hostPatterns: RegExp[];
  selectors: string[];
  // Optional: elements to remove before extracting
  removeSelectors?: string[];
  // Optional: custom extraction logic
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
      '.css-cygeeu', // Common Workday class
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
    name: 'BambooHR',
    hostPatterns: [/bamboohr\.com/],
    selectors: [
      '.job-posting__description',
      '.JobDescription',
      '#content',
    ],
  },
  {
    name: 'Jobvite',
    hostPatterns: [/jobvite\.com/, /jobs\.jobvite\.com/],
    selectors: [
      '.jv-job-detail-description',
      '.job-description',
      '#job-description',
    ],
  },
  {
    name: 'iCIMS',
    hostPatterns: [/icims\.com/, /careers-.*\.icims\.com/],
    selectors: [
      '.iCIMS_JobContent',
      '.job-description',
      '#job-content',
    ],
  },
  {
    name: 'Taleo',
    hostPatterns: [/taleo\.net/, /oracle\.com.*taleo/],
    selectors: [
      '.job-description',
      '#requisitionDescriptionInterface',
      '.contentlinepanel',
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
  // First, temporarily hide elements we want to exclude
  const hiddenElements: { element: HTMLElement; originalDisplay: string }[] = [];

  if (removeSelectors) {
    removeSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el instanceof HTMLElement) {
          hiddenElements.push({
            element: el,
            originalDisplay: el.style.display,
          });
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });
  }

  let result: string | null = null;

  // Try each selector until we find content
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Combine text from all matching elements
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

  // Restore hidden elements
  hiddenElements.forEach(({ element, originalDisplay }) => {
    if (originalDisplay) {
      element.style.display = originalDisplay;
    } else {
      element.style.removeProperty('display');
    }
  });

  return result;
}

// Generic fallback scraping (original logic)
function genericScrape(): string {
  const selectorsToHide = [
    'header',
    'footer',
    'nav',
    'iframe',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '#sidebar',
    '.sidebar',
    '#menu',
    '.menu',
    '.ad',
    '.ads',
    '.advertisement',
    '.cookie-banner',
    '#cookie-banner',
    '.modal',
    '.popup',
    '.notification',
    '.toast',
  ];

  const elementsToHide: { element: HTMLElement; originalDisplay: string }[] = [];

  selectorsToHide.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (el instanceof HTMLElement) {
        elementsToHide.push({
          element: el,
          originalDisplay: el.style.display,
        });
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
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple blank lines
    .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace
    .replace(/\n /g, '\n') // Remove leading spaces on lines
    .trim();
}

// Main scrape function
function scrapeJobDescription(): { content: string; source: string } {
  const jobBoard = detectJobBoard();

  if (jobBoard) {
    // Use custom extraction if available
    if (jobBoard.customExtract) {
      const content = jobBoard.customExtract();
      if (content) {
        return {
          content: cleanText(content),
          source: jobBoard.name,
        };
      }
    }

    // Try job board-specific selectors
    const content = extractFromSelectors(jobBoard.selectors, jobBoard.removeSelectors);
    if (content && content.length > 100) {
      return {
        content: cleanText(content),
        source: jobBoard.name,
      };
    }

    console.log(`KodKod: ${jobBoard.name} selectors didn't match, falling back to generic`);
  }

  // Fallback to generic scraping
  return {
    content: cleanText(genericScrape()),
    source: 'generic',
  };
}

// ============================================
// APPLICATION FORM AUTO-FILL FUNCTIONALITY
// ============================================

interface ApplicationPlatformConfig {
  name: string;
  hostPatterns: RegExp[];
  // URL patterns that indicate we're on an application form (not just job listing)
  applicationUrlPatterns: RegExp[];
  // Selectors for form containers
  formContainerSelectors: string[];
  // Platform-specific field label extraction
  labelSelectors?: string[];
}

const applicationPlatforms: ApplicationPlatformConfig[] = [
  {
    name: 'Workday',
    hostPatterns: [/myworkdayjobs\.com/, /wd\d+\.myworkday\.com/],
    applicationUrlPatterns: [/\/apply/, /\/applyManually/],
    formContainerSelectors: [
      '[data-automation-id="formContainer"]',
      '[data-automation-id="applicationForm"]',
      '.css-1dbjc4n', // Workday form wrapper
      'form',
    ],
    labelSelectors: [
      '[data-automation-id="formLabel"]',
      'label',
    ],
  },
  {
    name: 'Oracle Cloud HCM',
    hostPatterns: [/\.fa\.oraclecloud\.com/, /\.fa\.ocs\.oraclecloud\.com/],
    applicationUrlPatterns: [/\/apply\//, /\/section\//],
    formContainerSelectors: [
      '.application-form',
      '[data-component="form"]',
      'form',
    ],
  },
  {
    name: 'Formsite',
    hostPatterns: [/formsite\.com/],
    applicationUrlPatterns: [/.*/], // Formsite URLs are always forms
    formContainerSelectors: [
      '.form_table',
      '#FSForm',
      'form',
    ],
  },
  {
    name: 'Greenhouse',
    hostPatterns: [/greenhouse\.io/, /boards\.greenhouse\.io/],
    applicationUrlPatterns: [/\/applications\//, /\#app/],
    formContainerSelectors: [
      '#application_form',
      '.application-form',
      'form',
    ],
  },
  {
    name: 'Lever',
    hostPatterns: [/lever\.co/, /jobs\.lever\.co/],
    applicationUrlPatterns: [/\/apply/],
    formContainerSelectors: [
      '.application-form',
      '[data-qa="application-form"]',
      'form',
    ],
  },
  {
    name: 'SmartRecruiters',
    hostPatterns: [/smartrecruiters\.com/],
    applicationUrlPatterns: [/\/apply/],
    formContainerSelectors: [
      '.application-form',
      'form',
    ],
  },
  {
    name: 'Ashby',
    hostPatterns: [/ashbyhq\.com/],
    applicationUrlPatterns: [/\/application/],
    formContainerSelectors: [
      '[data-testid="application-form"]',
      'form',
    ],
  },
  {
    name: 'iCIMS',
    hostPatterns: [/icims\.com/],
    applicationUrlPatterns: [/\/apply/, /\/portal/],
    formContainerSelectors: [
      '.iCIMS_Form',
      'form',
    ],
  },
  {
    name: 'Taleo',
    hostPatterns: [/taleo\.net/],
    applicationUrlPatterns: [/\/apply/, /\/requisition/],
    formContainerSelectors: [
      '#requisitionApply',
      'form',
    ],
  },
];

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  options?: string[];
  required: boolean;
  placeholder?: string;
  currentValue?: string;
  element?: HTMLElement; // Not serialized, used for filling
}

// Detect if we're on an application form page
function detectApplicationPlatform(): ApplicationPlatformConfig | null {
  const hostname = window.location.hostname;
  const url = window.location.href;

  for (const platform of applicationPlatforms) {
    // Check hostname
    const hostnameMatch = platform.hostPatterns.some(pattern => pattern.test(hostname));
    if (!hostnameMatch) continue;

    // Check URL pattern for application page
    const urlMatch = platform.applicationUrlPatterns.some(pattern => pattern.test(url));
    if (urlMatch) {
      console.log(`KodKod: Detected application form on ${platform.name}`);
      return platform;
    }
  }

  return null;
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
  if (ariaLabel) {
    return ariaLabel.trim();
  }

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
    // Remove the input's value from the label text
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

  // 6. Check for label in parent container (common in form groups)
  const container = input.closest('.form-group, .field, .input-group, [class*="field"], [class*="form"]');
  if (container) {
    const label = container.querySelector('label, .label, [class*="label"]');
    if (label && label.textContent) {
      return label.textContent.trim();
    }
  }

  // 7. Check placeholder as last resort
  const placeholder = input.getAttribute('placeholder');
  if (placeholder) {
    return placeholder;
  }

  // 8. Use name attribute as fallback
  const name = input.getAttribute('name');
  if (name) {
    // Convert camelCase or snake_case to readable text
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return '';
}

// Get options for select elements
function getSelectOptions(select: HTMLSelectElement): string[] {
  const options: string[] = [];
  Array.from(select.options).forEach(opt => {
    if (opt.value && opt.text && opt.text.trim()) {
      options.push(opt.text.trim());
    }
  });
  return options;
}

// Get options for radio button groups
function getRadioOptions(name: string): string[] {
  const options: string[] = [];
  const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
  radios.forEach(radio => {
    const label = getLabelForInput(radio as HTMLElement);
    if (label) {
      options.push(label);
    }
  });
  return options;
}

// Scrape all form fields from the page
function scrapeFormFields(): { fields: FormField[]; platform: string | null } {
  const platform = detectApplicationPlatform();
  const fields: FormField[] = [];
  const processedNames = new Set<string>();

  // Find all input elements
  const inputs = document.querySelectorAll('input, select, textarea');

  inputs.forEach((element, index) => {
    const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    // Skip hidden, submit, button, and file inputs
    const type = el.type?.toLowerCase() || '';
    if (['hidden', 'submit', 'button', 'reset', 'image', 'file'].includes(type)) {
      return;
    }

    // Skip if not visible
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return;
    }

    // Generate a unique ID
    const fieldId = el.id || el.name || `field_${index}`;
    
    // Skip radio buttons we've already processed (group by name)
    if (type === 'radio') {
      if (processedNames.has(el.name)) return;
      processedNames.add(el.name);
    }

    const label = getLabelForInput(el);
    
    // Skip fields without labels (likely hidden or decorative)
    if (!label && type !== 'email' && type !== 'tel') {
      return;
    }

    const field: FormField = {
      id: fieldId,
      name: el.name || '',
      label: label || type,
      type: type || 'text',
      required: el.required || el.getAttribute('aria-required') === 'true',
      placeholder: el.placeholder || undefined,
      currentValue: el.value || undefined,
    };

    // Get options for select and radio
    if (el instanceof HTMLSelectElement) {
      field.options = getSelectOptions(el);
    } else if (type === 'radio' && el.name) {
      field.options = getRadioOptions(el.name);
    }

    fields.push(field);
  });

  console.log(`KodKod: Scraped ${fields.length} form fields from ${platform?.name || 'unknown platform'}`);
  return { fields, platform: platform?.name || null };
}

// Fill a form field with a value
function fillFormField(fieldId: string, value: string): boolean {
  // Try to find by ID first
  let element = document.getElementById(fieldId) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  
  // Try by name if not found
  if (!element) {
    element = document.querySelector(`[name="${fieldId}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  }

  if (!element) {
    console.warn(`KodKod: Could not find element with id/name: ${fieldId}`);
    return false;
  }

  const type = element.type?.toLowerCase() || '';

  try {
    if (element instanceof HTMLSelectElement) {
      // For select, find the option that matches the value
      const options = Array.from(element.options);
      const matchingOption = options.find(opt => 
        opt.text.toLowerCase().includes(value.toLowerCase()) ||
        opt.value.toLowerCase() === value.toLowerCase()
      );
      
      if (matchingOption) {
        element.value = matchingOption.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      
      // Try partial match
      const partialMatch = options.find(opt => 
        value.toLowerCase().includes(opt.text.toLowerCase()) ||
        opt.text.toLowerCase().includes(value.toLowerCase().split(' ')[0])
      );
      
      if (partialMatch) {
        element.value = partialMatch.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      
      return false;
    }

    if (type === 'radio') {
      // Find the radio button with matching label
      const radios = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
      for (const radio of radios) {
        const label = getLabelForInput(radio as HTMLElement);
        if (label.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(label.toLowerCase())) {
          (radio as HTMLInputElement).checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }

    if (type === 'checkbox') {
      const shouldCheck = ['yes', 'true', '1', 'checked'].includes(value.toLowerCase());
      (element as HTMLInputElement).checked = shouldCheck;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // For text, email, tel, textarea, etc.
    element.value = value;
    
    // Trigger events to ensure frameworks detect the change
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    // For React/Vue controlled inputs
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    
    if (nativeInputValueSetter && element instanceof HTMLInputElement) {
      nativeInputValueSetter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return true;
  } catch (err) {
    console.error(`KodKod: Error filling field ${fieldId}:`, err);
    return false;
  }
}

// Fill multiple form fields
function fillFormFields(values: Record<string, string>): { filled: number; failed: number } {
  let filled = 0;
  let failed = 0;

  for (const [fieldId, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    
    const success = fillFormField(fieldId, value);
    if (success) {
      filled++;
    } else {
      failed++;
    }
  }

  console.log(`KodKod: Filled ${filled} fields, ${failed} failed`);
  return { filled, failed };
}

// Check if current page is an application form
function isApplicationPage(): boolean {
  return detectApplicationPlatform() !== null;
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener(
  (
    request: { action: string; values?: Record<string, string> },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (request.action === 'scrape') {
      const result = scrapeJobDescription();
      console.log(`KodKod: Scraped from ${result.source}, ${result.content.length} chars`);
      sendResponse(result);
    }
    
    if (request.action === 'checkApplicationPage') {
      const platform = detectApplicationPlatform();
      sendResponse({ 
        isApplicationPage: platform !== null,
        platform: platform?.name || null
      });
    }

    if (request.action === 'scrapeFormFields') {
      const result = scrapeFormFields();
      sendResponse(result);
    }

    if (request.action === 'fillForm') {
      if (request.values) {
        const result = fillFormFields(request.values);
        sendResponse(result);
      } else {
        sendResponse({ error: 'No values provided' });
      }
    }

    return true; // Keep message channel open for async response
  }
);
