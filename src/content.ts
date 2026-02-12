/// <reference types="chrome" />
import { devLog, devWarn, devError, devGroup, devGroupEnd, devTable, devTimeStart, devTimeEnd, devFieldSummary, type FieldFillLog } from './lib/debug';

devLog('DETECT', 'Content script loaded');

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
        devLog('DETECT', `Detected job board: ${config.name}`);
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

    devWarn('SCRAPE', `${jobBoard.name} selectors didn't match, falling back to generic`);
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
  type: string; // 'text', 'textarea', 'radio', 'checkbox', 'email', 'tel', 'select', 'combobox', 'custom-dropdown', etc.
  options?: { value: string; text: string }[]; // For radio buttons, selects, and comboboxes
  required: boolean;
  placeholder?: string;
  currentValue?: string;
  selector?: string;
  buttonSelector?: string; // For ARIA combobox trigger buttons
  needsDebugger?: boolean; // Flag for complex dropdowns that need debugger API
  dropdownLib?: string; // For custom dropdowns: 'react-select', 'mui', 'ant-design', etc.
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
      devLog('DETECT', `Detected application form: ${platform.name}`);
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

  // 1b. Workday: check [data-automation-id="formField"] ancestor for <label>
  const workdayField = input.closest('[data-automation-id="formField"]');
  if (workdayField) {
    const wdLabel = workdayField.querySelector('label');
    if (wdLabel && wdLabel.textContent) {
      return wdLabel.textContent.trim();
    }
  }

  // 2. Check for aria-label (skip placeholder-like values)
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) {
    const lower = ariaLabel.toLowerCase().trim();
    const isPlaceholder = /^(select\b|choose\b|pick\b|search\b|type to\b)/.test(lower);
    if (!isPlaceholder) return ariaLabel.trim();
  }

  // 3. Check for aria-labelledby
  const ariaLabelledBy = input.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelEl = document.getElementById(ariaLabelledBy);
    if (labelEl && labelEl.textContent) {
      return labelEl.textContent.trim();
    }
  }

  // 3b. Check for aria-describedby (use as label if short, no periods)
  const ariaDescribedBy = input.getAttribute('aria-describedby');
  if (ariaDescribedBy) {
    const descEl = document.getElementById(ariaDescribedBy);
    if (descEl && descEl.textContent) {
      const descText = descEl.textContent.trim();
      if (descText.length < 100 && !descText.includes('.')) {
        return descText;
      }
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

  // 6b. Check nearby heading in fieldset, role="group", or section parent
  const groupParent = input.closest('fieldset, [role="group"], section');
  if (groupParent) {
    const heading = groupParent.querySelector('h1, h2, h3, h4, h5, h6, legend');
    if (heading && heading.textContent) {
      return heading.textContent.trim();
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

// ============================================
// FUZZY MATCHING UTILITY (Enhanced)
// ============================================

// Country aliases for matching
const COUNTRY_ALIASES: Record<string, string[]> = {
  'united states': ['us', 'usa', 'united states of america', 'u.s.', 'u.s.a.'],
  'united kingdom': ['uk', 'great britain', 'england', 'u.k.'],
  'south korea': ['korea, republic of', 'republic of korea'],
  'czech republic': ['czechia'],
};

// Build reverse lookup
const _countryCanonical = new Map<string, string>();
for (const [canon, aliases] of Object.entries(COUNTRY_ALIASES)) {
  _countryCanonical.set(canon, canon);
  for (const a of aliases) _countryCanonical.set(a, canon);
}

function normalizeCountry(text: string): string {
  return _countryCanonical.get(text.toLowerCase().trim()) || text.toLowerCase().trim();
}

// Degree aliases for matching
const DEGREE_ALIASES: Record<string, string[]> = {
  "bachelor's degree": [
    'bsc', 'bsc(hons)', 'bs', 'b.s.', 'b.sc.', 'ba', 'b.a.',
    'bachelor of science', 'bachelor of arts', 'bachelor of engineering',
    'bachelor of technology', 'beng', 'b.eng.', 'btech', 'b.tech.',
    'bachelor of commerce', 'bcom', 'b.com.', 'bachelor of business',
    'bba', 'b.b.a.', 'bachelor', 'bachelors', "bachelor's",
    'bachelor of fine arts', 'bfa', 'b.f.a.',
    'bachelor of education', 'bed', 'b.ed.',
    'bachelor of laws', 'llb', 'l.l.b.',
  ],
  "master's degree": [
    'msc', 'msc(hons)', 'ms', 'm.s.', 'm.sc.', 'ma', 'm.a.',
    'master of science', 'master of arts', 'master of engineering',
    'meng', 'm.eng.', 'mtech', 'm.tech.',
    'master of business administration', 'mba', 'm.b.a.',
    'master of commerce', 'mcom', 'm.com.',
    'master of fine arts', 'mfa', 'm.f.a.',
    'master of education', 'med', 'm.ed.',
    'master of laws', 'llm', 'l.l.m.',
    'master', 'masters', "master's",
    'master of public health', 'mph',
    'master of public administration', 'mpa',
  ],
  'doctoral degree': [
    'phd', 'ph.d.', 'ph.d', 'doctorate', 'doctor of philosophy',
    'dphil', 'd.phil.', 'edd', 'ed.d.', 'doctor of education',
    'md', 'm.d.', 'doctor of medicine',
    'jd', 'j.d.', 'juris doctor',
  ],
  'associate degree': [
    'associate', 'associates', "associate's",
    'associate of arts', 'aa', 'a.a.',
    'associate of science', 'as', 'a.s.',
    'associate of applied science', 'aas',
  ],
  'high school diploma': [
    'high school', 'secondary school', 'gcse', 'a-levels', 'a levels',
    'ged', 'diploma', 'secondary education',
  ],
};

const _degreeCanonical = new Map<string, string>();
for (const [canon, aliases] of Object.entries(DEGREE_ALIASES)) {
  _degreeCanonical.set(canon, canon);
  for (const a of aliases) _degreeCanonical.set(a, canon);
}

function normalizeDegree(text: string): string | null {
  const lower = text.toLowerCase().trim().replace(/[()]/g, '');
  return _degreeCanonical.get(lower) || null;
}

// Yes/No normalization sets
const YES_VARIANTS = new Set(['yes', 'y', 'true', '1', 'on']);
const NO_VARIANTS = new Set(['no', 'n', 'false', '0', 'off']);

// Decline-to-answer normalization
const DECLINE_VARIANTS = [
  'prefer not to say', 'prefer not to disclose', 'decline to answer',
  'decline to self-identify', 'decline to state', 'i do not wish to provide',
  'choose not to disclose', 'do not wish to answer',
];

function normalizeDecline(text: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const v of DECLINE_VARIANTS) {
    if (lower.includes(v) || v.includes(lower)) return 'DECLINE';
  }
  return null;
}

// Levenshtein distance for short strings
function levenshteinRatio(a: string, b: string): number {
  if (a.length > 50 || b.length > 50) return 0;
  const la = a.length, lb = b.length;
  if (la === 0) return lb === 0 ? 1 : 0;
  if (lb === 0) return 0;

  const d: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) d[i][0] = i;
  for (let j = 0; j <= lb; j++) d[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }

  return 1 - d[la][lb] / Math.max(la, lb);
}

function fuzzyMatch(target: string, candidate: string): number {
  const t = target.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();
  if (t === c) return 1.0;

  // Country alias match
  if (normalizeCountry(t) === normalizeCountry(c)) return 1.0;

  // Degree alias match
  const degT = normalizeDegree(t);
  const degC = normalizeDegree(c);
  if (degT && degC && degT === degC) return 1.0;
  // Also match if one side is canonical and the other normalizes to it
  if (degT && degT === c) return 1.0;
  if (degC && degC === t) return 1.0;

  // Yes/No normalization
  if ((YES_VARIANTS.has(t) && YES_VARIANTS.has(c)) || (NO_VARIANTS.has(t) && NO_VARIANTS.has(c))) return 1.0;

  // Decline-to-answer normalization
  if (normalizeDecline(t) && normalizeDecline(c)) return 0.95;

  // Exact contains
  if (c.includes(t) || t.includes(c)) return 0.8;

  // Levenshtein for short strings
  const lev = levenshteinRatio(t, c);
  if (lev >= 0.85) return lev;

  // Word overlap ratio
  const tWords = t.split(/\s+/);
  const cWords = c.split(/\s+/);
  const overlap = tWords.filter(w => cWords.some(cw => cw.includes(w) || w.includes(cw))).length;
  return overlap / Math.max(tWords.length, cWords.length);
}

function findBestOption(
  options: { element?: HTMLElement; text: string }[],
  value: string,
  threshold = 0.5
): { element?: HTMLElement; text: string; score: number } | null {
  // Adaptive threshold: lower for small option sets
  const effectiveThreshold = options.length <= 3 ? Math.min(threshold, 0.3) : threshold;

  const scored: { element?: HTMLElement; text: string; score: number }[] = [];
  for (const opt of options) {
    const score = fuzzyMatch(value, opt.text);
    scored.push({ ...opt, score });
  }

  // Log all scores in dev mode
  devGroup('MATCH', `findBestOption("${value.slice(0, 30)}") — ${options.length} candidates`);
  devTable(
    scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => ({ option: s.text.slice(0, 40), score: s.score.toFixed(3) }))
  );

  const best = scored.reduce<{ element?: HTMLElement; text: string; score: number } | null>(
    (acc, cur) => (cur.score >= effectiveThreshold && (!acc || cur.score > acc.score) ? cur : acc),
    null,
  );

  if (best) {
    devLog('MATCH', `Best match: "${best.text}" (score=${best.score.toFixed(3)})`);
  } else {
    devWarn('MATCH', `No match above threshold ${effectiveThreshold} for "${value.slice(0, 30)}"`);
  }
  devGroupEnd();

  return best;
}

// ============================================
// CUSTOM DROPDOWN FILLING (click simulation)
// ============================================

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fillCustomDropdown(field: FormField, value: string): Promise<boolean> {
  devTimeStart(`fillCustomDropdown_${field.id}`);
  // Find the trigger element
  const triggerSelectors: Record<string, string> = {
    'react-select': '[class*="react-select"] [class*="-control"]',
    'mui': '.MuiSelect-root, .MuiAutocomplete-root input',
    'ant-design': '.ant-select .ant-select-selector',
  };

  let trigger: HTMLElement | null = null;
  if (field.selector) {
    trigger = document.querySelector(field.selector) as HTMLElement;
  }
  if (!trigger && field.dropdownLib && triggerSelectors[field.dropdownLib]) {
    trigger = document.querySelector(triggerSelectors[field.dropdownLib]) as HTMLElement;
  }
  if (!trigger) {
    devWarn('FILL_CUSTOM', `Trigger not found for "${field.label}" (${field.dropdownLib})`);
    devTimeEnd('FILL_CUSTOM', `fillCustomDropdown_${field.id}`);
    return false;
  }
  devLog('FILL_CUSTOM', `Trigger found for "${field.label}" via ${field.selector ? 'selector' : 'lib-default'}`);

  try {
    // Open dropdown: use mousedown for React Select (it listens to mousedown, not click)
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    // If it's an input (autocomplete), type the value to filter
    if (trigger instanceof HTMLInputElement) {
      trigger.focus();
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(trigger, value);
      } else {
        trigger.value = value;
      }
      trigger.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Wait for menu to render
    await wait(300);

    // Search for options via cascade of selectors
    const optionSelectors = [
      '[role="option"]',
      '[class*="react-select__option"]',
      '.MuiMenuItem-root',
      '.ant-select-item-option',
      'li[data-value]',
    ];

    let optionElements: HTMLElement[] = [];
    for (const sel of optionSelectors) {
      const found = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
      if (found.length > 0) {
        optionElements = found;
        break;
      }
    }

    if (optionElements.length === 0) {
      // Close dropdown and fail
      document.body.click();
      return false;
    }

    // Fuzzy match the best option
    const optionsWithText = optionElements.map(el => ({
      element: el,
      text: el.textContent?.trim() || '',
    }));

    const match = findBestOption(optionsWithText, value);

    if (match?.element) {
      match.element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      match.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      devLog('FILL_CUSTOM', `Clicked option "${match.text}" (score=${match.score.toFixed(3)}) for "${field.label}"`);
      devTimeEnd('FILL_CUSTOM', `fillCustomDropdown_${field.id}`);
      return true;
    }

    // No match found, close dropdown
    document.body.click();
    devWarn('FILL_CUSTOM', `No matching option for "${field.label}" value="${value}"`);
    devTimeEnd('FILL_CUSTOM', `fillCustomDropdown_${field.id}`);
    return false;
  } catch (err) {
    devError('FILL_CUSTOM', `Error filling "${field.label}":`, err);
    document.body.click();
    devTimeEnd('FILL_CUSTOM', `fillCustomDropdown_${field.id}`);
    return false;
  }
}

// Reference to MAIN world input setter for use in fillCustomDropdown
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value'
)?.set;

// Scrape all form fields from the page (TEXT + RADIO + COMBOBOX)
function scrapeFormFields(): { fields: FormField[]; platform: string | null } {
  devTimeStart('scrapeFormFields');
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
    devLog('SCRAPE', `Pass 1 combobox: "${label}" [${options.length} opts] ${generateSelector(el)}`);
  });

  // PASS 1.5: Detect custom dropdowns (React Select, MUI, Ant Design, generic ARIA)
  const customDropdownSelectors: { selector: string; lib: string }[] = [
    { selector: '[class*="react-select"] [class*="-control"]', lib: 'react-select' },
    { selector: '.MuiSelect-root', lib: 'mui' },
    { selector: '.MuiAutocomplete-root', lib: 'mui' },
    { selector: '.ant-select', lib: 'ant-design' },
    { selector: '[aria-haspopup="listbox"]:not([role="combobox"]):not(select)', lib: 'generic-aria' },
  ];
  const customDropdownElements = new Set<HTMLElement>();

  for (const { selector, lib } of customDropdownSelectors) {
    document.querySelectorAll(selector).forEach((element, index) => {
      const el = element as HTMLElement;

      // Skip invisible
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      // Skip if already detected as ARIA combobox
      for (const cb of comboboxElements) {
        if (cb.contains(el) || el.contains(cb)) return;
      }
      // Skip if already detected as custom dropdown
      for (const cd of customDropdownElements) {
        if (cd.contains(el) || el.contains(cd)) return;
      }

      customDropdownElements.add(el);

      const label = getLabelForInput(el);
      if (!label) return; // Skip unlabeled custom dropdowns
      const fieldId = el.id || `custom_dropdown_${lib}_${index}`;

      // Try to get current value text
      const valueEl = el.querySelector('[class*="-singleValue"], [class*="-placeholder"], .MuiSelect-nativeInput, .ant-select-selection-item');
      const currentValue = valueEl?.textContent?.trim() || '';

      // generic-aria dropdowns (e.g. Workday) need the Chrome Debugger API
      // because synthetic DOM events have isTrusted=false and are ignored.
      // React Select / MUI / Ant Design work with click simulation.
      const useDebugger = lib === 'generic-aria';

      fields.push({
        id: fieldId,
        name: el.getAttribute('name') || '',
        label,
        type: useDebugger ? 'combobox' : 'custom-dropdown',
        required: el.getAttribute('aria-required') === 'true',
        currentValue: currentValue || undefined,
        selector: generateSelector(el),
        needsDebugger: useDebugger,
        dropdownLib: lib,
      });

      devLog('SCRAPE', `Pass 1.5 ${useDebugger ? 'debugger-dropdown' : 'custom-dropdown'}: "${label}" (${lib}) ${generateSelector(el)}`);
    });
  }

  // PASS 1.6: Detect ARIA radio groups, button toggles, and switches
  // These are yes/no or multi-choice questions rendered as clickable buttons, not native inputs
  const ariaRadioGroupElements = new Set<HTMLElement>();

  // ARIA radiogroups with [role="radio"] children
  document.querySelectorAll('[role="radiogroup"]').forEach((group, index) => {
    const el = group as HTMLElement;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    // Skip if already detected as combobox or custom dropdown
    for (const cb of comboboxElements) { if (cb.contains(el) || el.contains(cb)) return; }
    for (const cd of customDropdownElements) { if (cd.contains(el) || el.contains(cd)) return; }

    const radioOptions = Array.from(el.querySelectorAll('[role="radio"]')) as HTMLElement[];
    if (radioOptions.length === 0) return;

    ariaRadioGroupElements.add(el);

    const label = getLabelForInput(el);
    if (!label) return;
    const fieldId = el.id || `aria_radiogroup_${index}`;

    const options = radioOptions.map(opt => ({
      value: opt.getAttribute('data-value') || opt.textContent?.trim() || '',
      text: opt.textContent?.trim() || '',
    })).filter(o => o.text);

    const selectedOpt = radioOptions.find(opt => opt.getAttribute('aria-checked') === 'true');
    const currentValue = selectedOpt?.textContent?.trim() || '';

    fields.push({
      id: fieldId,
      name: el.getAttribute('name') || '',
      label,
      type: 'aria-radio',
      required: el.getAttribute('aria-required') === 'true',
      currentValue: currentValue || undefined,
      selector: generateSelector(el),
      options: options.length > 0 ? options : undefined,
      needsDebugger: false,
    });

    devLog('SCRAPE', `Pass 1.6 ARIA radiogroup: "${label}" [${options.length} opts] ${generateSelector(el)}`);
  });

  // [role="switch"] elements (toggle switches)
  document.querySelectorAll('[role="switch"]').forEach((element, index) => {
    const el = element as HTMLElement;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    for (const cb of comboboxElements) { if (cb.contains(el)) return; }
    for (const rg of ariaRadioGroupElements) { if (rg.contains(el)) return; }

    const label = getLabelForInput(el);
    if (!label) return;
    const fieldId = el.id || `switch_${index}`;
    const isChecked = el.getAttribute('aria-checked') === 'true';

    fields.push({
      id: fieldId,
      name: el.getAttribute('name') || '',
      label,
      type: 'switch',
      required: el.getAttribute('aria-required') === 'true',
      currentValue: isChecked ? 'true' : 'false',
      selector: generateSelector(el),
      needsDebugger: false,
    });

    devLog('SCRAPE', `Pass 1.6 switch: "${label}" (${isChecked ? 'on' : 'off'}) ${generateSelector(el)}`);
  });

  // PASS 2: Find native <select> elements
  const selects = document.querySelectorAll('select');
  selects.forEach((element, index) => {
    const el = element as HTMLSelectElement;

    // Skip invisible
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    // Skip selects inside comboboxes
    for (const cb of comboboxElements) {
      if (cb.contains(el)) return;
    }

    const label = getLabelForInput(el);
    const fieldId = el.id || el.name || `select_${index}`;

    // Extract options, filtering out placeholders
    const options: { value: string; text: string }[] = [];
    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i];
      const text = opt.text.trim();
      const value = opt.value;
      // Skip placeholder options
      if (!value && /^(select|choose|pick|--|—|\s*)$/i.test(text)) continue;
      if (!value && text === '') continue;
      if (text) options.push({ value, text });
    }

    const currentOption = el.options[el.selectedIndex];
    const currentValue = currentOption ? currentOption.text.trim() : '';

    fields.push({
      id: fieldId,
      name: el.name || '',
      label: label || 'Dropdown',
      type: 'select',
      required: el.required || el.getAttribute('aria-required') === 'true',
      currentValue: currentValue || undefined,
      selector: generateSelector(el),
      options: options.length > 0 ? options : undefined,
      needsDebugger: false,
    });

    devLog('SCRAPE', `Pass 2 <select>: "${label}" [${options.length} opts] ${generateSelector(el)}`);
  });

  // PASS 3: Find text inputs, textareas, radio buttons, and checkboxes (skip those inside comboboxes)
  const inputs = document.querySelectorAll('input, textarea');

  inputs.forEach((element, index) => {
    const el = element as HTMLInputElement | HTMLTextAreaElement;
    
    // Skip inputs inside comboboxes
    for (const cb of comboboxElements) {
      if (cb.contains(el)) return;
    }
    
    const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';
    
    // Only process text-like inputs, radio buttons, and checkboxes
    const allowedTypes = ['text', 'email', 'tel', 'url', 'number', 'textarea', 'radio', 'checkbox'];
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
      currentValue: type === 'checkbox'
        ? ((el as HTMLInputElement).checked ? 'true' : 'false')
        : (el.value || undefined),
      selector: generateSelector(el),
      needsDebugger: false,
    };

    // Get options for radio buttons
    if (type === 'radio' && (el as HTMLInputElement).name) {
      field.options = getRadioOptions((el as HTMLInputElement).name);
    }

    fields.push(field);
  });

  devLog('SCRAPE', `Scraped ${fields.length} fields`);
  devGroup('SCRAPE', `All scraped fields (${fields.length})`);
  devTable(fields.map(f => ({
    id: f.id, label: (f.label || '').slice(0, 40), type: f.type,
    options: f.options?.length ?? '-', selector: (f.selector || '').slice(0, 50),
    needsDebugger: f.needsDebugger ? 'Y' : '-',
  })));
  devGroupEnd();
  devTimeEnd('SCRAPE', 'scrapeFormFields');
  return { fields, platform: platform?.name || null };
}

// Capture current form values (for learning)
function captureFormValues(): Record<string, { label: string; value: string; type: string; options?: { value: string; text: string }[] }> {
  devTimeStart('captureFormValues');
  const values: Record<string, { label: string; value: string; type: string; options?: { value: string; text: string }[] }> = {};
  const processedNames = new Set<string>();

  // Capture native <select> values
  const selects = document.querySelectorAll('select');
  selects.forEach((element, index) => {
    const el = element as HTMLSelectElement;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const fieldId = el.id || el.name || `select_${index}`;
    const label = getLabelForInput(el);
    const selectedOption = el.options[el.selectedIndex];
    const selectedText = selectedOption ? selectedOption.text.trim() : '';

    if (selectedText) {
      const options: { value: string; text: string }[] = [];
      for (let i = 0; i < el.options.length; i++) {
        const opt = el.options[i];
        if (opt.value || opt.text.trim()) {
          options.push({ value: opt.value, text: opt.text.trim() });
        }
      }
      values[fieldId] = {
        label: label || 'Dropdown',
        value: selectedText,
        type: 'select',
        options: options.length > 0 ? options : undefined,
      };
    }
  });

  // Capture ARIA radio group values
  document.querySelectorAll('[role="radiogroup"]').forEach((group, index) => {
    const el = group as HTMLElement;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const label = getLabelForInput(el);
    if (!label) return;
    const fieldId = el.id || `aria_radiogroup_${index}`;
    const selected = el.querySelector('[role="radio"][aria-checked="true"]') as HTMLElement | null;
    if (selected) {
      const options = Array.from(el.querySelectorAll('[role="radio"]')).map(opt => ({
        value: opt.getAttribute('data-value') || opt.textContent?.trim() || '',
        text: opt.textContent?.trim() || '',
      })).filter(o => o.text);

      values[fieldId] = {
        label,
        value: selected.textContent?.trim() || '',
        type: 'aria-radio',
        options: options.length > 0 ? options : undefined,
      };
    }
  });

  // Capture ARIA switch values
  document.querySelectorAll('[role="switch"]').forEach((element, index) => {
    const el = element as HTMLElement;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const label = getLabelForInput(el);
    if (!label) return;
    const fieldId = el.id || `switch_${index}`;
    values[fieldId] = {
      label,
      value: el.getAttribute('aria-checked') === 'true' ? 'true' : 'false',
      type: 'switch',
    };
  });

  // Capture generic-aria dropdown values ([aria-haspopup="listbox"] — e.g. Workday)
  document.querySelectorAll('[aria-haspopup="listbox"]:not([role="combobox"]):not(select)').forEach((element, index) => {
    const el = element as HTMLElement;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const label = getLabelForInput(el);
    if (!label) return;
    const fieldId = el.id || `generic_aria_${index}`;

    // The selected value is typically the button's text content
    const selectedText = el.textContent?.trim() || '';
    // Skip if still showing placeholder
    if (!selectedText || /^(select|choose|pick|search)\b/i.test(selectedText.toLowerCase())) return;

    values[fieldId] = {
      label,
      value: selectedText,
      type: 'combobox',
    };
  });

  // Capture input and textarea values
  const inputs = document.querySelectorAll('input, textarea');

  inputs.forEach((element, index) => {
    const el = element as HTMLInputElement | HTMLTextAreaElement;
    const type = (el as HTMLInputElement).type?.toLowerCase() || 'text';

    // Only process text-like inputs, radio buttons, and checkboxes
    const allowedTypes = ['text', 'email', 'tel', 'url', 'number', 'textarea', 'radio', 'checkbox'];
    if (!allowedTypes.includes(type) && el.tagName !== 'TEXTAREA') return;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const fieldId = el.id || el.name || `field_${index}`;

    // Checkboxes
    if (type === 'checkbox') {
      const label = getLabelForInput(el);
      if (!label) return;
      values[fieldId] = {
        label,
        value: (el as HTMLInputElement).checked ? 'true' : 'false',
        type: 'checkbox',
      };
      return;
    }

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

  const count = Object.keys(values).length;
  devLog('CAPTURE', `Captured ${count} field values`);
  devGroup('CAPTURE', `Captured values (${count})`);
  devTable(Object.entries(values).map(([id, v]) => ({
    fieldId: id, label: v.label.slice(0, 30), value: v.value.slice(0, 30), type: v.type,
  })));
  devGroupEnd();
  devTimeEnd('CAPTURE', 'captureFormValues');
  return values;
}

// ============================================
// MAIN WORLD BRIDGE (React compatibility)
// ============================================

let mainWorldReady = false;
const pendingFillRequests = new Map<string, { resolve: (success: boolean) => void; timer: ReturnType<typeof setTimeout> }>();

// Listen for MAIN world ready signal
window.addEventListener('kodkod-main-world-ready', () => {
  mainWorldReady = true;
  devLog('FILL_MAIN', 'MAIN world bridge connected');
});

// Listen for fill responses from MAIN world
window.addEventListener('kodkod-fill-response', ((event: CustomEvent<{ id: string; success: boolean; error?: string }>) => {
  const { id, success } = event.detail;
  const pending = pendingFillRequests.get(id);
  if (pending) {
    clearTimeout(pending.timer);
    pendingFillRequests.delete(id);
    pending.resolve(success);
  }
}) as EventListener);

function fillViaMainWorld(selector: string, value: string, fieldType: string): Promise<boolean> {
  if (!mainWorldReady) return Promise.resolve(false);

  return new Promise((resolve) => {
    const id = `fill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timer = setTimeout(() => {
      pendingFillRequests.delete(id);
      resolve(false);
    }, 2000);

    pendingFillRequests.set(id, { resolve, timer });

    window.dispatchEvent(new CustomEvent('kodkod-fill-request', {
      detail: { id, selector, value, fieldType },
    }));
  });
}

// Fill a single form field
async function fillFormField(fieldId: string, value: string, selectorHint?: string): Promise<boolean> {
  devTimeStart(`fillField_${fieldId}`);
  devLog('FILL_REGULAR', `Filling "${fieldId}" with "${value.slice(0, 30)}"${selectorHint ? ` hint=${selectorHint}` : ''}`);

  let element = document.getElementById(fieldId) as HTMLElement | null;
  let lookupMethod = 'id';
  if (!element) {
    element = document.querySelector(`[name="${fieldId}"]`) as HTMLElement | null;
    lookupMethod = 'name';
  }
  // Fallback: try the selector hint (for ARIA radiogroups, switches, etc.)
  if (!element && selectorHint) {
    element = document.querySelector(selectorHint) as HTMLElement | null;
    lookupMethod = 'selector-hint';
  }
  if (!element) {
    devWarn('FILL_REGULAR', `Element not found for "${fieldId}"`);
    devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
    return false;
  }
  devLog('FILL_REGULAR', `Element found via ${lookupMethod}: <${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}>`);

  const tagName = element.tagName;
  const type = (element as HTMLInputElement).type?.toLowerCase() || '';

  // Try MAIN world first (React-compatible) for text inputs, textareas, selects, and checkboxes
  if (mainWorldReady && (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT')) {
    const selector = generateSelector(element);
    const fieldType = type === 'checkbox' ? 'checkbox' : tagName === 'SELECT' ? 'select' : tagName === 'TEXTAREA' ? 'textarea' : 'text';

    // For selects, we need to resolve value text to actual option value first
    let fillValue = value;
    if (tagName === 'SELECT') {
      const selectEl = element as HTMLSelectElement;
      const lowerValue = value.toLowerCase();
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].text.trim().toLowerCase() === lowerValue || selectEl.options[i].value === value) {
          fillValue = selectEl.options[i].value;
          break;
        }
      }
    }

    const mainWorldSuccess = await fillViaMainWorld(selector, fillValue, fieldType);
    if (mainWorldSuccess) {
      devLog('FILL_REGULAR', `MAIN world succeeded for "${fieldId}"`);
      devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
      return true;
    }
    devWarn('FILL_REGULAR', `MAIN world failed for "${fieldId}", falling back to DOM`);
    // Fall through to direct DOM manipulation if MAIN world failed
  }

  try {
    // Native <select> elements
    if (tagName === 'SELECT') {
      const selectEl = element as HTMLSelectElement;
      const lowerValue = value.toLowerCase();

      // Try exact value match, then exact text match, then contains match
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === value) {
          selectEl.value = selectEl.options[i].value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          devLog('FILL_REGULAR', `SELECT exact-value match for "${fieldId}"`);
          devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
          return true;
        }
      }
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].text.trim().toLowerCase() === lowerValue) {
          selectEl.value = selectEl.options[i].value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          devLog('FILL_REGULAR', `SELECT exact-text match for "${fieldId}"`);
          devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
          return true;
        }
      }
      for (let i = 0; i < selectEl.options.length; i++) {
        const optText = selectEl.options[i].text.trim().toLowerCase();
        if (optText.includes(lowerValue) || lowerValue.includes(optText)) {
          selectEl.value = selectEl.options[i].value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          devLog('FILL_REGULAR', `SELECT contains match for "${fieldId}"`);
          devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
          return true;
        }
      }
      devWarn('FILL_REGULAR', `SELECT no option matched for "${fieldId}"`);
      devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
      return false;
    }

    // Checkboxes
    if (type === 'checkbox') {
      const shouldCheck = ['yes', 'true', '1', 'on', 'checked'].includes(value.toLowerCase());
      (element as HTMLInputElement).checked = shouldCheck;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      devLog('FILL_REGULAR', `Checkbox "${fieldId}" set to ${shouldCheck}`);
      devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
      return true;
    }

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
          devLog('FILL_REGULAR', `Radio "${fieldId}" matched label="${label}"`);
          devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
          return true;
        }
      }
      devWarn('FILL_REGULAR', `Radio "${fieldId}" no option matched for "${value}"`);
      devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
      return false;
    }

    // ARIA radio groups ([role="radiogroup"] with [role="radio"] children)
    if (element.getAttribute('role') === 'radiogroup') {
      const radioOptions = Array.from(element.querySelectorAll('[role="radio"]')) as HTMLElement[];
      const lowerValue = value.toLowerCase();
      for (const opt of radioOptions) {
        const optText = (opt.textContent?.trim() || '').toLowerCase();
        const optValue = (opt.getAttribute('data-value') || '').toLowerCase();
        if (optText === lowerValue || optValue === lowerValue ||
            optText.includes(lowerValue) || lowerValue.includes(optText)) {
          opt.click();
          opt.dispatchEvent(new Event('change', { bubbles: true }));
          devLog('FILL_REGULAR', `ARIA radio "${fieldId}" selected "${optText}"`);
          devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
          return true;
        }
      }
      devWarn('FILL_REGULAR', `ARIA radio "${fieldId}" no option matched for "${value}"`);
      devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
      return false;
    }

    // ARIA switches ([role="switch"])
    if (element.getAttribute('role') === 'switch') {
      const shouldBeOn = ['yes', 'true', '1', 'on', 'checked'].includes(value.toLowerCase());
      const isOn = element.getAttribute('aria-checked') === 'true';
      if (shouldBeOn !== isOn) {
        element.click();
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      devLog('FILL_REGULAR', `Switch "${fieldId}" set to ${shouldBeOn}`);
      devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
      return true;
    }

    // Text inputs and textareas
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      (element as HTMLInputElement).value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      devLog('FILL_REGULAR', `Text "${fieldId}" filled (${value.length} chars)`);
      devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
      return true;
    }

    devWarn('FILL_REGULAR', `Unhandled element type for "${fieldId}": <${tagName}>`);
    devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
    return false;
  } catch (err) {
    devError('FILL_REGULAR', `Error filling "${fieldId}":`, err);
    devTimeEnd('FILL_REGULAR', `fillField_${fieldId}`);
    return false;
  }
}

// Fill all form fields (with single retry on failure)
async function fillFormFields(values: Record<string, string>, fieldMeta?: FormField[]): Promise<{ filled: number; failed: number }> {
  let filled = 0;
  let failed = 0;
  const fieldLogs: FieldFillLog[] = [];

  // Build lookups from field ID to selector and metadata
  const selectorMap = new Map<string, string>();
  const metaMap = new Map<string, FormField>();
  if (fieldMeta) {
    for (const f of fieldMeta) {
      if (f.selector) selectorMap.set(f.id, f.selector);
      metaMap.set(f.id, f);
    }
  }

  for (const [fieldId, value] of Object.entries(values)) {
    if (!value) continue;

    const meta = metaMap.get(fieldId);
    let success = await fillFormField(fieldId, value, selectorMap.get(fieldId));
    let retried = false;

    // Retry once after 500ms if first attempt failed
    if (!success) {
      devLog('FILL_REGULAR', `Retrying "${fieldId}" after 500ms...`);
      await wait(500);
      success = await fillFormField(fieldId, value, selectorMap.get(fieldId));
      retried = true;
      if (success) {
        devLog('FILL_REGULAR', `Retry succeeded for "${fieldId}"`);
      } else {
        devWarn('FILL_REGULAR', `Retry also failed for "${fieldId}"`);
      }
    }

    fieldLogs.push({
      fieldId,
      label: meta?.label || fieldId,
      type: meta?.type || 'unknown',
      value,
      success,
      method: success ? 'filled' : 'failed',
      retried,
    });

    if (success) filled++;
    else failed++;
  }

  devFieldSummary('FILL_REGULAR', fieldLogs);
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
    request: { action: string; values?: Record<string, string>; question?: string; fields?: FormField[] },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    devLog('DETECT', `Message received: ${request.action}`);

    if (request.action === 'scrape') {
      // Skip scraping in non-content iframes (reCAPTCHA, ads, analytics)
      if (window.self !== window.top) {
        const frameHost = window.location.hostname;
        const skipHosts = ['google.com', 'gstatic.com', 'recaptcha.net', 'doubleclick.net',
          'googlesyndication.com', 'googletagmanager.com', 'facebook.com', 'facebook.net'];
        if (skipHosts.some(h => frameHost.includes(h))) {
          return false;
        }
      }

      const result = scrapeJobDescription();
      devLog('SCRAPE', `Scraped from ${result.source}, ${result.content.length} chars, isTopFrame: ${window.self === window.top}`);
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
      // Only respond from the frame that has form fields (avoid iframe race condition)
      if (!hasFormFields()) return false;
      if (request.values) {
        fillFormFields(request.values, request.fields).then(result => sendResponse(result));
        return true; // Keep channel open for async response
      } else {
        sendResponse({ error: 'No values provided' });
      }
    }

    // Fill custom dropdowns via click simulation (React Select, MUI, Ant Design)
    if (request.action === 'fillCustomDropdowns') {
      // Only respond from the frame that has form fields
      if (!hasFormFields()) return false;
      if (request.fields && request.values) {
        (async () => {
          let filled = 0;
          let failed = 0;
          const failedFields: string[] = [];
          for (let i = 0; i < request.fields!.length; i++) {
            const field = request.fields![i];
            const value = request.values![field.id];
            if (!value) continue;
            // Close any stale dropdown before opening the next
            if (i > 0) {
              document.body.click();
              await wait(400);
            }
            const success = await fillCustomDropdown(field, value);
            if (success) {
              filled++;
            } else {
              failed++;
              failedFields.push(field.id);
            }
          }
          sendResponse({ filled, failed, failedFields });
        })();
        return true; // Keep channel open for async response
      } else {
        sendResponse({ error: 'No fields or values provided' });
      }
    }

    if (request.action === 'captureFormValues') {
      if (!hasFormFields()) return false;
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
