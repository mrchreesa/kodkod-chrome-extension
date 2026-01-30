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

// Listen for messages from side panel
chrome.runtime.onMessage.addListener(
  (
    request: { action: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: { content: string; source?: string }) => void
  ) => {
    if (request.action === 'scrape') {
      const result = scrapeJobDescription();
      console.log(`KodKod: Scraped from ${result.source}, ${result.content.length} chars`);
      sendResponse(result);
    }
    return true; // Keep message channel open for async response
  }
);
