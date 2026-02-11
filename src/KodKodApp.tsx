
import { useEffect, useState } from 'react';
import { fetchProfiles, generateResume, fetchCredits, formAgentFill, formAgentLearn, formAgentAnswer, fillFormWithDebugger, detachDebugger, getCachedProfileContact, cacheProfileContact, type Profile, type ProfileContact, type CreditData, type FormLearning, type DebuggerFillField } from './lib/api';
import { Loader2, Sparkles, FileText, LogIn, Download, RefreshCw, Moon, Sun, Coins, X, ClipboardPen, CheckCircle2, RotateCcw, FileCheck, RotateCw, Eye, EyeOff, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Textarea } from './components/ui/Textarea';
import { Select } from './components/ui/Select';
import { useTheme } from './components/ThemeProvider';
import { Checkbox } from './components/ui/Checkbox';
import { LanguageToggle } from './components/ui/LanguageToggle';
import { OnboardingCarousel } from './components/OnboardingCarousel';
import { WhatIsKodKod } from './components/WhatIsKodKod';
import { SampleResumePreview } from './components/SampleResumePreview';

type TabType = 'generate' | 'fill';

export default function KodKodApp() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditData | null>(null);
  const { theme, setTheme } = useTheme();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  
  // Session state (shared between tabs)
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [scrapeSource, setScrapeSource] = useState<string | null>(null);
  
  // Generation state (Tab 1)
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [coverLetterHtml, setCoverLetterHtml] = useState<string | null>(null);
  const [generatedResumeId, setGeneratedResumeId] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<string>('');
  
  // Preview state (Tab 2)
  const [showPreview, setShowPreview] = useState(false);
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  
  // Auto-fill state (Tab 2)
  const [isApplicationPage, setIsApplicationPage] = useState(false);
  const [applicationPlatform, setApplicationPlatform] = useState<string | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillResult, setAutoFillResult] = useState<{ filled: number; failed: number; memoriesUsed?: number } | null>(null);
  const [autoFillStep, setAutoFillStep] = useState<string>('');
  const [fieldsFilledCount, setFieldsFilledCount] = useState(0);
  
  // Form agent session state (for learning)
  const [formSessionId, setFormSessionId] = useState<string | null>(null);
  const [agentFilledValues, setAgentFilledValues] = useState<Record<string, { value: string; label: string; type: string; options?: { value: string; text: string }[] }> | null>(null);
  const [showLearnPrompt, setShowLearnPrompt] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [learnResult, setLearnResult] = useState<{ learned: number; reinforced: number; corrected: number } | null>(null);
  
  // Manual Q&A state
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualAnswer, setManualAnswer] = useState('');
  const [editedAnswer, setEditedAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isRefreshingFromForm, setIsRefreshingFromForm] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  // Generation Options
  const [skipSummary, setSkipSummary] = useState(() => {
    const saved = localStorage.getItem('kodkod_skipSummary');
    return saved ? JSON.parse(saved) : false;
  });
  const [useUKEnglish, setUseUKEnglish] = useState(() => {
    const saved = localStorage.getItem('kodkod_useUKEnglish');
    return saved ? JSON.parse(saved) : false;
  });
  const [includeCoverLetter, setIncludeCoverLetter] = useState(() => {
    const saved = localStorage.getItem('kodkod_includeCoverLetter');
    return saved ? JSON.parse(saved) : false;
  });
  const [coverLetterOnly, setCoverLetterOnly] = useState(() => {
    const saved = localStorage.getItem('kodkod_coverLetterOnly');
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    return localStorage.getItem('kodkod_selectedTemplate') || 'harvard';
  });

  // Onboarding
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    return localStorage.getItem('kodkod_hasSeenOnboarding') === 'true';
  });

  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    localStorage.setItem('kodkod_hasSeenOnboarding', 'true');
  };

  // Turnstile
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://www.kodkodai.com';
  const TURNSTILE_URL = `${BASE_URL}/turnstile-only`;

  // New Application - resets everything
  const handleNewApplication = () => {
    if (!confirm('Start new application? This will clear your current session.')) return;
    
    // Clear session data
    setJobDescription('');
    setCompanyName('');
    setJobTitle('');
    setScrapeSource(null);
    setGeneratedHtml(null);
    setCoverLetterHtml(null);
    setGeneratedResumeId(null);
    setAutoFillResult(null);
    setFieldsFilledCount(0);
    setFormSessionId(null);
    setAgentFilledValues(null);
    setShowLearnPrompt(false);
    setLearnResult(null);
    setShowPreview(false);
    setError(null);
    
    // Clear saved session
    localStorage.removeItem('kodkod_session');
    
    // Reset to Generate tab
    setActiveTab('generate');
    
    // Refresh turnstile
    setTurnstileToken(null);
    setTurnstileKey(prev => prev + 1);
  };

  // Copy text helpers
  const extractTextFromHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.innerText || '';
  };

  const handleCopyResume = async () => {
    if (!generatedHtml) return;
    const text = extractTextFromHtml(generatedHtml);
    await navigator.clipboard.writeText(text);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2000);
  };

  const handleCopyCoverLetter = async () => {
    if (!coverLetterHtml) return;
    const text = extractTextFromHtml(coverLetterHtml);
    await navigator.clipboard.writeText(text);
    setCopiedCoverLetter(true);
    setTimeout(() => setCopiedCoverLetter(false), 2000);
  };

  useEffect(() => {
    checkAuth();
    checkApplicationPage();
    
    // Load session from localStorage
    const savedSession = localStorage.getItem('kodkod_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.jobDescription) setJobDescription(session.jobDescription);
        if (session.companyName) setCompanyName(session.companyName);
        if (session.jobTitle) setJobTitle(session.jobTitle);
        if (session.generatedHtml) setGeneratedHtml(session.generatedHtml);
        if (session.coverLetterHtml) setCoverLetterHtml(session.coverLetterHtml);
        if (session.generatedResumeId) setGeneratedResumeId(session.generatedResumeId);
        if (session.activeTab) setActiveTab(session.activeTab);
      } catch (e) {
        console.log('Failed to restore session:', e);
      }
    }
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TURNSTILE_TOKEN') {
        setTurnstileToken(event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Keyboard shortcut: Cmd/Ctrl+Enter to generate
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        // Trigger generate if on generate tab and ready
        const generateBtn = document.querySelector('[data-generate-btn]') as HTMLButtonElement;
        if (generateBtn && !generateBtn.disabled) {
          generateBtn.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const checkApplicationPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkApplicationPage' });
      if (response) {
        setIsApplicationPage(response.isApplicationPage);
        setApplicationPlatform(response.platform);
      }
    } catch (e) {
      console.log('Could not check application page:', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('kodkod_skipSummary', JSON.stringify(skipSummary));
    localStorage.setItem('kodkod_useUKEnglish', JSON.stringify(useUKEnglish));
    localStorage.setItem('kodkod_includeCoverLetter', JSON.stringify(includeCoverLetter));
    localStorage.setItem('kodkod_coverLetterOnly', JSON.stringify(coverLetterOnly));
    localStorage.setItem('kodkod_selectedTemplate', selectedTemplate);
  }, [skipSummary, useUKEnglish, includeCoverLetter, coverLetterOnly, selectedTemplate]);

  // Save session to localStorage when it changes
  useEffect(() => {
    const session = {
      jobDescription,
      companyName,
      jobTitle,
      generatedHtml,
      coverLetterHtml,
      generatedResumeId,
      activeTab,
    };
    localStorage.setItem('kodkod_session', JSON.stringify(session));
  }, [jobDescription, companyName, jobTitle, generatedHtml, coverLetterHtml, generatedResumeId, activeTab]);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const [profileData, creditData] = await Promise.all([
        fetchProfiles(),
        fetchCredits().catch(() => null)
      ]);
      setProfiles(profileData);
      setCredits(creditData);
      setError(null);
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        setProfiles([]);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setError(null);
    setScrapeSource(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
      if (response && response.content) {
        const content = response.content.trim();
        
        if (!content) {
          setError('No job description found on this page. Try refreshing the page and try again.');
          return;
        }
        
        if (content.length < 50) {
          setError('Very little text found. Please refresh the page and wait for it to fully load, then try again.');
          return;
        }
        
        if (content.split('\n').length <= 2 && content.length < 200) {
          setError('Only a small amount of text was found. Make sure you\'re on a job posting page, refresh it, and try again.');
          return;
        }
        
        const lowerContent = content.toLowerCase();
        const irrelevantPatterns = ['0 notifications', 'notifications', 'sign in', 'log in', 'cookie', 'accept all'];
        const hasIrrelevantContent = irrelevantPatterns.some(pattern => 
          lowerContent.startsWith(pattern) || (lowerContent.includes(pattern) && content.length < 300)
        );
        
        if (hasIrrelevantContent) {
          setError('It looks like the page hasn\'t fully loaded yet. Please refresh the page, wait for the job description to appear, then try again.');
          return;
        }
        
        setJobDescription(content);
        if (response.source && response.source !== 'generic') {
          setScrapeSource(response.source);
        }

        // Set session name from tab title if we don't have one yet
        if (!companyName && !jobTitle) {
          const name = await extractSessionName();
          if (name) setCompanyName(name);
        }
      } else {
        setError('No content found. Please refresh the page and make sure it\'s fully loaded, then try again.');
      }
    } catch (e: any) {
      console.error(e);
      const errorMsg = e?.message || String(e);
      if (errorMsg.includes('connect') || errorMsg.includes('Receiving end does not exist')) {
        setError('Please refresh this page first, then click "Get from Page" again.');
      } else {
        setError('Could not access page content. Please refresh the page and try again.');
      }
    }
  };

  const generationSteps = coverLetterOnly ? [
    'Analyzing job requirements...',
    'Crafting your message...',
    'Formatting cover letter...',
  ] : [
    'Analyzing job requirements...',
    'Matching your experience...',
    'Formatting resume...',
  ];

  // Extract a session name from the active tab for the header indicator
  const extractSessionName = async (): Promise<string | null> => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.title) return null;
      const title = tab.title;

      // Try to extract company/job from common tab title patterns
      // "Job Title at Company | Platform" or "Company - Job Title" etc.
      const atMatch = title.match(/^(.+?)\s+at\s+(.+?)(?:\s*[|\-–—]|$)/i);
      if (atMatch) {
        setJobTitle(prev => prev || atMatch[1].trim());
        return atMatch[2].trim();
      }

      const dashMatch = title.match(/^(.+?)\s*[|\-–—]\s*(.+?)(?:\s*[|\-–—]|$)/);
      if (dashMatch) {
        // If the second part looks like a platform name, use the first part
        const platforms = ['greenhouse', 'lever', 'workday', 'indeed', 'linkedin', 'glassdoor', 'smartrecruiters', 'ashby', 'apply'];
        const secondLower = dashMatch[2].toLowerCase();
        if (platforms.some(p => secondLower.includes(p))) {
          return dashMatch[1].trim();
        }
        return dashMatch[1].trim();
      }

      // Fallback: use the hostname
      if (tab.url) {
        try {
          const hostname = new URL(tab.url).hostname.replace(/^www\./, '').replace(/\.(com|io|co|org|net)$/, '');
          return hostname.charAt(0).toUpperCase() + hostname.slice(1);
        } catch { /* ignore */ }
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (profiles.length === 0 || !jobDescription || !turnstileToken) return;
    setGenerating(true);
    setError(null);
    setGenerationStep(generationSteps[0]);

    // Set session name early so the header shows context immediately
    if (!companyName && !jobTitle) {
      const name = await extractSessionName();
      if (name) setCompanyName(name);
    }

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < generationSteps.length) {
        setGenerationStep(generationSteps[stepIndex]);
      }
    }, 2500);

    try {
      const result = await generateResume({
        masterProfileId: profiles[0].id,
        jobDescription,
        template: selectedTemplate,
        includeCoverLetter: coverLetterOnly ? false : includeCoverLetter,
        coverLetterOnly,
        turnstileToken,
        skipSummary,
        useUKEnglish,
      });

      setGeneratedHtml(result.html || null);
      setCoverLetterHtml(result.coverLetterHtml || null);
      setGeneratedResumeId(result.resumeId || null);
      setCompanyName(result.companyName || '');

      const newCredits = await fetchCredits();
      setCredits(newCredits);
      
      // Auto-navigate to Fill Forms tab after successful generation
      setActiveTab('fill');

    } catch (err: any) {
      setError(err.message);
      setTurnstileError(true);
    } finally {
      clearInterval(stepInterval);
      setGenerating(false);
      setGenerationStep('');
      setTurnstileToken(null);
    }
  };

  const handleRetryTurnstile = () => {
    setTurnstileError(false);
    setTurnstileKey(prev => prev + 1);
  };

  const autoFillSteps = [
    'Scanning form fields...',
    'Matching your profile...',
    'Filling application...',
  ];

  // Heuristic field mapper: instantly match common fields to profile contact data
  const heuristicPatterns: { pattern: RegExp; field: keyof ProfileContact; split?: 'first' | 'last' }[] = [
    { pattern: /\b(first\s*name|given\s*name)\b/i, field: 'full_name', split: 'first' },
    { pattern: /\b(last\s*name|surname|family\s*name)\b/i, field: 'full_name', split: 'last' },
    { pattern: /\b(full\s*name|your\s*name|candidate\s*name)\b/i, field: 'full_name' },
    { pattern: /\be-?mail\b/i, field: 'email' },
    { pattern: /\b(phone|mobile|telephone|cell)\b/i, field: 'phone' },
    { pattern: /\blinkedin\b/i, field: 'linkedin' },
    { pattern: /\b(website|portfolio|personal\s*site)\b/i, field: 'website' },
    { pattern: /\b(city|location|address)\b/i, field: 'location' },
  ];

  function applyHeuristics(
    fields: any[],
    contact: ProfileContact
  ): { heuristicValues: Record<string, string>; remainingFields: any[] } {
    const heuristicValues: Record<string, string> = {};
    const remainingFields: any[] = [];

    for (const field of fields) {
      // Only apply heuristics to simple text-like fields
      if (!['text', 'email', 'tel', 'url'].includes(field.type)) {
        remainingFields.push(field);
        continue;
      }

      let matched = false;
      const label = (field.label || '').toLowerCase();

      for (const { pattern, field: contactField, split } of heuristicPatterns) {
        if (pattern.test(label)) {
          let value = contact[contactField] || '';
          if (!value) break;

          if (split && contactField === 'full_name') {
            const parts = value.split(/\s+/);
            if (split === 'first') value = parts[0] || '';
            else value = parts.slice(1).join(' ') || '';
          }

          if (value) {
            heuristicValues[field.id] = value;
            matched = true;
            break;
          }
        }
      }

      if (!matched) remainingFields.push(field);
    }

    return { heuristicValues, remainingFields };
  }

  const handleAutoFill = async () => {
    if (profiles.length === 0 || !turnstileToken) return;

    setAutoFilling(true);
    setError(null);
    setAutoFillResult(null);
    setAutoFillStep(autoFillSteps[0]);
    setShowLearnPrompt(false);
    setLearnResult(null);

    // Set session name early so the header shows context immediately
    if (!companyName && !jobTitle) {
      const name = await extractSessionName();
      if (name) setCompanyName(name);
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) throw new Error('No active tab');

      const scrapeResponse = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeFormFields' });
      if (!scrapeResponse?.fields || scrapeResponse.fields.length === 0) {
        throw new Error('No form fields found on this page');
      }

      // Apply heuristic mapping for instant contact field fills
      let heuristicValues: Record<string, string> = {};
      let fieldsForAI = scrapeResponse.fields;

      const contact = getCachedProfileContact(profiles[0].id) || profiles[0].contact_info;
      if (contact) {
        // Cache for future use
        cacheProfileContact(profiles[0].id, contact);
        const result = applyHeuristics(scrapeResponse.fields, contact);
        heuristicValues = result.heuristicValues;
        fieldsForAI = result.remainingFields;
        console.log(`KodKod: Heuristic matched ${Object.keys(heuristicValues).length} fields, ${fieldsForAI.length} remaining for AI`);
      }

      // Separate fields into regular, custom-dropdown, and debugger-needing
      const regularFields = scrapeResponse.fields.filter((f: any) => !f.needsDebugger && f.type !== 'custom-dropdown');
      const customDropdownFields = scrapeResponse.fields.filter((f: any) => f.type === 'custom-dropdown');
      const debuggerFields = scrapeResponse.fields.filter((f: any) => f.needsDebugger);

      console.log(`KodKod: ${regularFields.length} regular, ${customDropdownFields.length} custom dropdown, ${debuggerFields.length} debugger fields`);

      setAutoFillStep(autoFillSteps[1]);

      // Only send remaining fields (not heuristic-matched) to AI
      const fillResponse = await formAgentFill({
        fields: fieldsForAI,
        masterProfileId: profiles[0].id,
        turnstileToken,
        sessionId: formSessionId || undefined,
        jobUrl: tab.url,
        jobDescription: jobDescription || undefined,
        companyName: companyName || applicationPlatform || undefined,
      });

      // Merge heuristic values with AI values (AI takes precedence for any overlap)
      fillResponse.values = { ...heuristicValues, ...fillResponse.values };

      if (!fillResponse.success) {
        throw new Error('Failed to generate form values');
      }

      setFormSessionId(fillResponse.sessionId);
      
      const filledData: Record<string, { value: string; label: string; type: string; options?: { value: string; text: string }[] }> = {};
      scrapeResponse.fields.forEach((field: any) => {
        if (fillResponse.values[field.id]) {
          filledData[field.id] = {
            value: fillResponse.values[field.id],
            label: field.label,
            type: field.type,
            options: field.options,
          };
        }
      });
      setAgentFilledValues(filledData);

      setAutoFillStep(autoFillSteps[2]);

      let totalFilled = 0;
      let totalFailed = 0;

      // Step 1: Fill regular fields with content script (text inputs, radio buttons)
      if (regularFields.length > 0) {
        const regularValues: Record<string, string> = {};
        regularFields.forEach((field: any) => {
          if (fillResponse.values[field.id]) {
            regularValues[field.id] = fillResponse.values[field.id];
          }
        });
        
        const fillResult = await chrome.tabs.sendMessage(tab.id, {
          action: 'fillForm',
          values: regularValues,
          fields: regularFields,
        });
        
        totalFilled += fillResult.filled || 0;
        totalFailed += fillResult.failed || 0;
      }

      // Step 2: Fill custom dropdowns via click simulation (React Select, MUI, Ant Design)
      const debuggerFallbackFields: any[] = [];
      if (customDropdownFields.length > 0) {
        const customFields = customDropdownFields.filter((f: any) => fillResponse.values[f.id]);
        const customValues: Record<string, string> = {};
        customFields.forEach((f: any) => { customValues[f.id] = fillResponse.values[f.id]; });

        if (customFields.length > 0) {
          console.log(`KodKod: Filling ${customFields.length} custom dropdowns via click simulation`);
          const customResult = await chrome.tabs.sendMessage(tab.id, {
            action: 'fillCustomDropdowns',
            fields: customFields,
            values: customValues,
          });

          totalFilled += customResult.filled || 0;
          // Fields that failed click simulation fall back to debugger
          if (customResult.failedFields?.length > 0) {
            const failedCustomFields = customFields.filter((f: any) => customResult.failedFields.includes(f.id));
            debuggerFallbackFields.push(...failedCustomFields);
          }
        }
      }

      // Step 3: Fill dropdown fields with Chrome Debugger API (ARIA comboboxes + failed custom dropdowns)
      const allDebuggerFields = [...debuggerFields, ...debuggerFallbackFields];
      if (allDebuggerFields.length > 0) {
        const debuggerFillFields: DebuggerFillField[] = allDebuggerFields
          .filter((field: any) => fillResponse.values[field.id])
          .map((field: any) => ({
            selector: field.buttonSelector || field.selector,
            value: fillResponse.values[field.id],
            type: field.type, // 'combobox', 'yesno', etc.
          }));
        
        if (debuggerFillFields.length > 0) {
          console.log(`KodKod: Filling ${debuggerFillFields.length} dropdowns with debugger API`);
          
          const debuggerResult = await fillFormWithDebugger(tab.id, debuggerFillFields);
          totalFilled += debuggerResult.filled;
          totalFailed += debuggerResult.failed;
          
          console.log('KodKod: Debugger fill results:', debuggerResult.results);
          
          // Detach debugger after filling
          await detachDebugger(tab.id);
        }
      }

      setAutoFillResult({
        filled: totalFilled,
        failed: totalFailed,
        memoriesUsed: fillResponse.memoriesUsed,
      });
      setFieldsFilledCount(prev => prev + totalFilled);

      setShowLearnPrompt(true);

      if (fillResponse.creditCharged) {
        const newCredits = await fetchCredits();
        setCredits(newCredits);
      }

    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('connect') || errorMsg.includes('Receiving end does not exist')) {
        setError('Please refresh this page first, then try filling the form again.');
      } else {
        setError(errorMsg);
      }
      setTurnstileError(true);
    } finally {
      setAutoFilling(false);
      setAutoFillStep('');
      setTurnstileToken(null);
    }
  };

  const handleLearnFromForm = async () => {
    if (!agentFilledValues) return;
    
    setIsLearning(true);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      const captureResponse = await chrome.tabs.sendMessage(tab.id, { action: 'captureFormValues' });
      const finalValues = captureResponse?.values || {};

      const learnings: FormLearning[] = [];
      
      for (const [fieldId, agentData] of Object.entries(agentFilledValues)) {
        const finalData = finalValues[fieldId];
        
        if (!finalData || !finalData.value) continue;
        
        if (finalData.value === agentData.value) {
          learnings.push({
            questionText: agentData.label,
            fieldType: agentData.type,
            agentValue: agentData.value,
            finalValue: finalData.value,
            options: agentData.options,
            type: 'accepted',
          });
        } else {
          learnings.push({
            questionText: agentData.label,
            fieldType: agentData.type,
            agentValue: agentData.value,
            finalValue: finalData.value,
            options: agentData.options,
            type: 'corrected',
          });
        }
      }
      
      for (const [fieldId, rawFinalData] of Object.entries(finalValues)) {
        const finalData = rawFinalData as { label: string; value: string; type: string; options?: { value: string; text: string }[] };
        if (!agentFilledValues[fieldId] && finalData.value) {
          learnings.push({
            questionText: finalData.label,
            fieldType: finalData.type,
            finalValue: finalData.value,
            options: finalData.options,
            type: 'new',
          });
        }
      }

      if (learnings.length > 0) {
        const result = await formAgentLearn({
          learnings,
          sessionId: formSessionId || undefined,
        });
        setLearnResult(result);
      } else {
        setLearnResult({ learned: 0, reinforced: 0, corrected: 0 });
      }
      
      setShowLearnPrompt(false);
      
    } catch (err: any) {
      console.error('Learning failed:', err);
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('connect') || errorMsg.includes('Receiving end does not exist')) {
        setError('Please refresh this page first, then try saving again.');
      }
    } finally {
      setIsLearning(false);
    }
  };

  // Handle manual Q&A - generate answer (don't save yet)
  const handleAnswerQuestion = async () => {
    if (!manualQuestion.trim() || profiles.length === 0 || !turnstileToken) return;
    
    setIsAnswering(true);
    setManualAnswer('');
    setEditedAnswer('');
    setAnswerSaved(false);
    
    try {
      const result = await formAgentAnswer({
        question: manualQuestion.trim(),
        masterProfileId: profiles[0].id,
        turnstileToken,
        saveToMemory: false, // Don't auto-save - user will save after editing
      });
      
      setManualAnswer(result.answer);
      setEditedAnswer(result.answer); // Initialize editable field with AI answer
      
      // Refresh turnstile for next use
      setTurnstileToken(null);
      setTurnstileKey(prev => prev + 1);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnswering(false);
    }
  };

  // Save edited answer to memory
  const handleSaveAnswer = async () => {
    if (!manualQuestion.trim() || !editedAnswer.trim()) return;
    
    setIsSavingAnswer(true);
    
    try {
      // Use the learn endpoint to save this Q&A
      await formAgentLearn({
        learnings: [{
          questionText: manualQuestion.trim(),
          fieldType: 'textarea', // Manual Q&A is always text
          finalValue: editedAnswer.trim(),
          type: 'new',
        }],
      });
      
      setAnswerSaved(true);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingAnswer(false);
    }
  };

  // Refresh answer from form field
  const handleRefreshFromForm = async () => {
    if (!manualQuestion.trim()) return;
    
    setIsRefreshingFromForm(true);
    setRefreshError(null);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');
      
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'getFieldValueByQuestion',
        question: manualQuestion.trim()
      });
      
      if (response?.found && response.value) {
        setEditedAnswer(response.value);
        setAnswerSaved(false); // Reset saved state since we have new content
      } else {
        setRefreshError('Could not find matching field on page');
      }
    } catch (err: any) {
      console.error('Refresh from form failed:', err);
      // Check for connection errors (content script not loaded)
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('connect') || errorMsg.includes('Receiving end does not exist')) {
        setRefreshError('Please refresh the page first, then try again');
      } else {
        setRefreshError('Could not access page - try refreshing');
      }
    } finally {
      setIsRefreshingFromForm(false);
    }
  };

  const clearQA = () => {
    setManualQuestion('');
    setManualAnswer('');
    setEditedAnswer('');
    setAnswerSaved(false);
    setRefreshError(null);
  };
  
  const handleDownloadResume = () => {
    if (!generatedHtml) return;
    
    const titleMatch = generatedHtml.match(/<title>([^<]+)<\/title>/);
    const userName = titleMatch ? titleMatch[1] : 'Resume';
    const title = companyName 
      ? `Resume - ${userName} - ${companyName}`
      : `Resume - ${userName}`;
    
    localStorage.setItem('kodkod_print_content', generatedHtml);
    localStorage.setItem('kodkod_print_title', title);
    window.open(chrome.runtime.getURL('print.html'), '_blank');
  };

  const handleDownloadCoverLetter = () => {
    if (!coverLetterHtml) return;
    
    const titleMatch = coverLetterHtml.match(/<title>[^<]+ - ([^<]+)<\/title>/);
    const userName = titleMatch ? titleMatch[1] : 'Cover Letter';
    const title = companyName
      ? `Cover Letter - ${userName} - ${companyName}`
      : `Cover Letter - ${userName}`;
    
    localStorage.setItem('kodkod_print_content', coverLetterHtml);
    localStorage.setItem('kodkod_print_title', title);
    window.open(chrome.runtime.getURL('print.html'), '_blank');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Onboarding for first-time users
  if (profiles.length === 0 && !loading && !error) {
    if (!hasSeenOnboarding) {
      return (
        <div className="h-screen bg-background flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="w-24 mx-auto">
              <img src="/name-light.png" alt="KodKod" className="w-full dark:hidden" />
              <img src="/name.png" alt="KodKod" className="w-full hidden dark:block" />
            </div>
          </div>
          <OnboardingCarousel onComplete={completeOnboarding} />
        </div>
      );
    }

    // Login screen
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="w-24 mx-auto">
            <img src="/name-light.png" alt="KodKod" className="w-full dark:hidden" />
            <img src="/name.png" alt="KodKod" className="w-full hidden dark:block" />
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col">
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-xl font-bold font-hand">Welcome to KodKod</h2>
            <p className="text-muted-foreground text-sm">Create tailored resumes in seconds</p>
          </div>

          <div className="mb-6">
            <SampleResumePreview />
          </div>

          <div className="space-y-4 mt-auto">
            <a
              href={`${BASE_URL}/login`}
              target="_blank"
              rel="noreferrer"
              className="sketchy-button inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full gap-2 rounded-md"
            >
              <LogIn className="h-4 w-4" /> Log In to Get Started
            </a>

            <button onClick={checkAuth} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
              <RefreshCw className="h-3 w-3" /> I've logged in, refresh
            </button>

            <WhatIsKodKod />
          </div>
        </div>
      </div>
    );
  }

  // Check if we have generated content
  const hasGeneratedContent = generatedHtml || coverLetterHtml;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* Fullscreen Preview Overlay */}
      {showPreview && hasGeneratedContent && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col">
          {/* Preview Header */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Close Preview
            </button>
          </div>
          
          {/* Preview Content */}
          <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
            {/* Resume Preview */}
            {generatedHtml && (
              <div className={`flex flex-col ${coverLetterHtml ? 'flex-1' : 'flex-1'}`}>
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resume</p>
                  <button
                    onClick={handleCopyResume}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedResume ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copiedResume ? 'Copied!' : 'Copy text'}
                  </button>
                </div>
                <iframe
                  srcDoc={generatedHtml}
                  className="flex-1 w-full border border-border rounded bg-white"
                  title="Resume Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
            {/* Cover Letter Preview */}
            {coverLetterHtml && (
              <div className={`flex flex-col ${generatedHtml ? 'flex-1' : 'flex-1'}`}>
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cover Letter</p>
                  <button
                    onClick={handleCopyCoverLetter}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedCoverLetter ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copiedCoverLetter ? 'Copied!' : 'Copy text'}
                  </button>
                </div>
                <iframe
                  srcDoc={coverLetterHtml}
                  className="flex-1 w-full border border-border rounded bg-white"
                  title="Cover Letter Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
          
          {/* Preview Footer Actions */}
          <div className="p-3 border-t border-border bg-card/50 flex gap-2">
            {generatedHtml && (
              <Button onClick={handleDownloadResume} variant="outline" size="sm" className="flex-1 gap-1.5">
                <Download className="h-3.5 w-3.5" /> Resume
              </Button>
            )}
            {coverLetterHtml && (
              <Button onClick={handleDownloadCoverLetter} variant="outline" size="sm" className="flex-1 gap-1.5">
                <Download className="h-3.5 w-3.5" /> Cover Letter
              </Button>
            )}
            {generatedResumeId && (
              <a
                href={`https://www.kodkodai.com/edit/${generatedResumeId}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Edit
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Global Header */}
      <header className="p-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="w-20">
            <img src="/name-light.png" alt="KodKod" className="w-full dark:hidden" />
            <img src="/name.png" alt="KodKod" className="w-full hidden dark:block" />
          </div>
          <div className="flex items-center gap-1.5">
            {credits && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                <Coins className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium">
                  {credits.isUnlimited ? '∞' : credits.credits}
                </span>
              </div>
            )}
            <button
              onClick={checkAuth}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
        
        {/* Session Indicator with New Application button */}
        <div className="mt-2 px-2 py-1 bg-primary/5 rounded-md text-xs text-muted-foreground flex items-center gap-1.5">
          {(companyName || jobTitle) ? (
            <>
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate flex-1">
                {companyName && jobTitle ? `${companyName} - ${jobTitle}` : companyName || jobTitle}
              </span>
            </>
          ) : (generating || autoFilling) ? (
            <>
              <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />
              <span className="flex-1">{applicationPlatform || 'Processing...'}</span>
            </>
          ) : jobDescription ? (
            <>
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="flex-1 text-muted-foreground/70">Application in progress</span>
            </>
          ) : (
            <span className="flex-1 text-muted-foreground/70">No application started</span>
          )}
          <button
            onClick={handleNewApplication}
            className="flex-shrink-0 px-2 py-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors flex items-center gap-1"
            title="Start New Application"
          >
            <RotateCcw className="h-3 w-3" />
            <span>New</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${
            activeTab === 'generate'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Generate
          {hasGeneratedContent && (
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-green-500 rounded-full" title="Content ready" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('fill')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors relative flex items-center justify-center gap-2 ${
            activeTab === 'fill'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <ClipboardPen className="h-4 w-4" />
          Fill Forms
          {fieldsFilledCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              {fieldsFilledCount}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-4 overflow-auto">
        {/* Error/Warning Banner */}
        {error && (
          <div className={`p-3 text-sm rounded-lg font-medium flex items-start justify-between gap-2 ${
            error.toLowerCase().includes('refresh') 
              ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hidden Turnstile Iframe */}
        <div className="h-0 overflow-hidden opacity-0 absolute">
          {!turnstileToken && !turnstileError && (
            <iframe key={turnstileKey} src={TURNSTILE_URL} className="w-[300px] h-[65px]" />
          )}
        </div>

        {/* TAB 1: Generate */}
        {activeTab === 'generate' && (
          <>
            {generating ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-border rounded-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
                <div className="text-center space-y-5 p-6">
                  <div className="relative mx-auto">
                    <img src="/star.png" alt="" className="w-20 h-20 mx-auto" style={{ animation: 'slow-bounce 2s infinite' }} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-foreground font-semibold text-base">
                      {coverLetterOnly ? 'Generating Your Cover Letter' : 'Generating Your Resume'}
                    </h3>
                    <p className="text-muted-foreground text-xs">{generationStep}</p>
                  </div>
                  <div className="w-48 mx-auto">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full relative overflow-hidden bg-primary/50" style={{ width: '100%' }}>
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
                            width: '50%',
                            animation: 'shimmer-slide 1.5s infinite linear'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                    {['Analyzing', 'Matching', 'Formatting'].map((step, i) => (
                      <span key={step} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${generationSteps.indexOf(generationStep) >= i ? 'bg-primary' : 'bg-primary/30'}`} />
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <style>{`
                  @keyframes shimmer-slide { 0% { transform: translateX(-200%); } 100% { transform: translateX(300%); } }
                  @keyframes slow-bounce { 0%, 100% { transform: translateY(-25%); } 50% { transform: translateY(0); } }
                `}</style>
              </div>
            ) : (
              <>
                {/* Job Description */}
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-muted-foreground uppercase tracking-wider text-[10px] font-medium">Job Description</label>
                  <div className="relative flex-1 flex flex-col">
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => {
                        setJobDescription(e.target.value);
                        setScrapeSource(null);
                      }}
                      placeholder="Paste job description..."
                      className="flex-1 min-h-[80px] font-mono text-sm pr-8"
                    />
                    {jobDescription && (
                      <button
                        onClick={() => { setJobDescription(''); setScrapeSource(null); }}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Button variant="outline" size="sm" onClick={handleScrape} className="w-full text-xs gap-1">
                      <FileText className="h-3 w-3" /> Get from Page
                    </Button>
                    {scrapeSource && (
                      <p className="text-[10px] text-primary text-center font-medium">Extracted from {scrapeSource}</p>
                    )}
                  </div>
                </div>

                {/* Template Selection */}
                <div className={`space-y-2 transition-opacity ${coverLetterOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="text-muted-foreground uppercase tracking-wider text-[10px] font-medium">Resume Template</label>
                  <Select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} disabled={coverLetterOnly}>
                    <option value="harvard">Harvard Style (Classic)</option>
                    <option value="modern">Hybrid (Modern)</option>
                    <option value="minimal">Creative (Minimal)</option>
                  </Select>
                </div>

                {/* Cover Letter Only Toggle */}
                <div className="p-3 border rounded-lg bg-card/50">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCoverLetterOnly(!coverLetterOnly)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${coverLetterOnly ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${coverLetterOnly ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium">Cover Letter Only</p>
                      <p className="text-[10px] text-muted-foreground">Generate only a cover letter</p>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className={`space-y-3 p-3 border rounded-lg bg-card/50 transition-opacity ${coverLetterOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="skipSummary" checked={skipSummary} onCheckedChange={(c) => setSkipSummary(c as boolean)} disabled={coverLetterOnly} />
                      <label htmlFor="skipSummary" className="text-sm font-medium">Skip Summary</label>
                    </div>
                    <LanguageToggle checked={useUKEnglish} onCheckedChange={setUseUKEnglish} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="coverLetter" checked={includeCoverLetter} onCheckedChange={(c) => setIncludeCoverLetter(c as boolean)} disabled={coverLetterOnly} />
                    <label htmlFor="coverLetter" className="text-sm font-medium">Include Cover Letter</label>
                  </div>
                </div>
              </>
            )}

            {/* Generate Button */}
            <div className="sticky bottom-0 bg-background pt-2 space-y-2">
              <Button
                data-generate-btn
                onClick={handleGenerate}
                disabled={generating || profiles.length === 0 || !jobDescription || !turnstileToken}
                className="w-full gap-2 text-base h-11 shadow-lg"
              >
                {generating ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Generating...</>
                ) : coverLetterOnly ? (
                  <><Sparkles className="h-5 w-5" /> Generate Cover Letter</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Generate Resume</>
                )}
              </Button>
              
              {turnstileError ? (
                <button
                  onClick={handleRetryTurnstile}
                  className="text-sm font-medium text-center text-red-500 hover:text-red-600 hover:underline w-full py-2 px-4 border-2 border-red-500/30 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  ⚠️ Verification failed - Click to retry
                </button>
              ) : !turnstileToken && !generating ? (
                <p className="text-[10px] text-center text-muted-foreground">Preparing your session...</p>
              ) : null}
            </div>
          </>
        )}

        {/* TAB 2: Fill Forms */}
        {activeTab === 'fill' && (
          <>
            {/* Auto-fill result banner */}
            {autoFillResult && (
              <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Filled {autoFillResult.filled} field{autoFillResult.filled !== 1 ? 's' : ''}
                    {autoFillResult.memoriesUsed ? ` (${autoFillResult.memoriesUsed} from memory)` : ''}
                    {autoFillResult.failed > 0 && ` · ${autoFillResult.failed} failed`}
                  </span>
                  <button onClick={() => { setAutoFillResult(null); setShowLearnPrompt(false); }} className="ml-auto hover:text-green-700 dark:hover:text-green-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {showLearnPrompt && (
                  <div className="mt-3 pt-3 border-t border-green-500/20">
                    <p className="text-xs text-muted-foreground mb-2">Review and edit, then save so I can learn.</p>
                    <button
                      onClick={handleLearnFromForm}
                      disabled={isLearning}
                      className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                    >
                      {isLearning ? <><Loader2 className="h-3 w-3 animate-spin" /> Learning...</> : <>💾 Done - Save & Learn</>}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {learnResult && (
              <div className="p-3 bg-primary/10 text-primary text-sm rounded-lg border border-primary/20 flex items-center gap-2">
                <span>🧠</span>
                <span>
                  {learnResult.learned > 0 && `Learned ${learnResult.learned} new`}
                  {learnResult.reinforced > 0 && `${learnResult.learned > 0 ? ' · ' : ''}Reinforced ${learnResult.reinforced}`}
                  {learnResult.corrected > 0 && `${(learnResult.learned > 0 || learnResult.reinforced > 0) ? ' · ' : ''}Updated ${learnResult.corrected}`}
                  {learnResult.learned === 0 && learnResult.reinforced === 0 && learnResult.corrected === 0 && 'No changes detected'}
                </span>
                <button onClick={() => setLearnResult(null)} className="ml-auto hover:text-primary/70"><X className="h-4 w-4" /></button>
              </div>
            )}

            {autoFilling ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-border rounded-lg bg-gradient-to-br from-blue-500/5 via-background to-blue-500/10">
                <div className="text-center space-y-5 p-6">
                  <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-xl" style={{ animation: 'pulse-ring 2s infinite' }} />
                    <div className="relative" style={{ animation: 'gentle-float 3s infinite ease-in-out' }}>
                      <img src="/application.png" alt="" className="w-16 h-16" style={{ animation: 'write-motion 1.5s infinite ease-in-out' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-foreground font-semibold text-base">Auto-Filling Application</h3>
                    <p className="text-muted-foreground text-xs">{autoFillStep}</p>
                  </div>
                  <div className="w-48 mx-auto space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-muted rounded" />
                        <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-blue-500/50 rounded" style={{ animation: `fill-progress 2s infinite ease-out`, animationDelay: `${i * 0.4}s` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                    {['Scanning', 'Matching', 'Filling'].map((step, i) => (
                      <span key={step} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${autoFillSteps.indexOf(autoFillStep) >= i ? 'bg-blue-500 animate-pulse' : 'bg-blue-500/30'}`} />
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <style>{`
                  @keyframes pulse-ring { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.2; } }
                  @keyframes gentle-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                  @keyframes write-motion { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
                  @keyframes fill-progress { 0% { width: 0%; } 50% { width: 100%; } 100% { width: 100%; } }
                `}</style>
              </div>
            ) : (
              <>
                {/* Documents Section */}
                {hasGeneratedContent && (
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileCheck className="h-4 w-4 text-green-500" />
                      Documents Ready
                    </div>
                    
                    {/* Preview Button - Opens Fullscreen */}
                    <button
                      onClick={() => setShowPreview(true)}
                      className="w-full py-2.5 px-3 text-sm font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview Documents
                    </button>
                    
                    {/* Download Buttons */}
                    <div className="flex gap-2">
                      {generatedHtml && (
                        <Button onClick={handleDownloadResume} variant="outline" size="sm" className="flex-1 gap-1.5">
                          <Download className="h-3.5 w-3.5" /> Resume
                        </Button>
                      )}
                      {coverLetterHtml && (
                        <Button onClick={handleDownloadCoverLetter} variant="outline" size="sm" className="flex-1 gap-1.5">
                          <Download className="h-3.5 w-3.5" /> Cover Letter
                        </Button>
                      )}
                    </div>
                    
                    {/* Edit on Website Button */}
                    {generatedResumeId && (
                      <a
                        href={`https://www.kodkodai.com/edit/${generatedResumeId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-3 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Edit on Website
                      </a>
                    )}
                  </Card>
                )}

                {/* Form Status + Manual Q&A */}
                <div className="flex-1 flex flex-col gap-4">
                  {/* Form status indicator */}
                  {isApplicationPage && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        <span className="text-primary font-medium">{applicationPlatform || 'Form'}</span> detected
                      </span>
                    </div>
                  )}
                  
                  {/* Manual Q&A Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Manual Questions</span>
                    </div>

                    <Textarea
                      value={manualQuestion}
                      onChange={(e) => setManualQuestion(e.target.value)}
                      placeholder="Paste a form question here..."
                      className="min-h-[60px] text-sm"
                    />
                    
                    <Button
                      onClick={handleAnswerQuestion}
                      disabled={!manualQuestion.trim() || isAnswering || !turnstileToken || profiles.length === 0}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      {isAnswering ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5" /> Generate Answer</>
                      )}
                    </Button>
                    
                    {/* Answer Display - Editable */}
                    {manualAnswer && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-primary flex items-center gap-1">
                            {answerSaved ? (
                              <><CheckCircle2 className="h-3 w-3 text-green-500" /> Saved to Memory</>
                            ) : (
                              'AI Answer (edit if needed)'
                            )}
                          </span>
                          <button onClick={clearQA} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        
                        {/* Editable answer textarea */}
                        <Textarea
                          value={editedAnswer}
                          onChange={(e) => {
                            setEditedAnswer(e.target.value);
                            setAnswerSaved(false); // Reset saved state on edit
                          }}
                          className="min-h-[80px] text-sm"
                          placeholder="Edit the answer here..."
                        />
                        
                        {/* Action buttons - Row 1: Copy + Refresh */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(editedAnswer)}
                            className="flex-1 py-1.5 px-3 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1"
                          >
                            📋 Copy
                          </button>
                          <button
                            onClick={handleRefreshFromForm}
                            disabled={isRefreshingFromForm || !manualQuestion.trim()}
                            className="flex-1 py-1.5 px-3 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                            title="Pull current value from form field"
                          >
                            {isRefreshingFromForm ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Loading...</>
                            ) : (
                              <><RotateCw className="h-3 w-3" /> From Form</>
                            )}
                          </button>
                        </div>
                        
                        {/* Refresh error */}
                        {refreshError && (
                          <p className="text-[10px] text-yellow-700 dark:text-yellow-400">{refreshError}</p>
                        )}
                        
                        {/* Action buttons - Row 2: Save */}
                        <button
                          onClick={handleSaveAnswer}
                          disabled={isSavingAnswer || answerSaved || !editedAnswer.trim()}
                          className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                            answerSaved 
                              ? 'bg-green-500/20 text-green-600 dark:text-green-400 cursor-default'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                          }`}
                        >
                          {isSavingAnswer ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
                          ) : answerSaved ? (
                            <><CheckCircle2 className="h-3 w-3" /> Saved to Memory</>
                          ) : (
                            '💾 Save to Memory'
                          )}
                        </button>
                        
                        <p className="text-[10px] text-muted-foreground">
                          Copy → paste into form → edit → click "From Form" to pull back → save
                        </p>
                      </div>
                    )}
                    
                    {!manualAnswer && (
                      <p className="text-[10px] text-muted-foreground">
                        For questions not filled automatically — paste them here, get an AI answer, and save to memory so they're filled next time.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Fill Form Button */}
            <div className="sticky bottom-0 bg-background pt-2 space-y-2">
              <Button
                onClick={handleAutoFill}
                disabled={autoFilling || profiles.length === 0 || !turnstileToken}
                className="w-full gap-2 text-base h-11 shadow-lg"
              >
                {autoFilling ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Filling...</>
                ) : (
                  <><ClipboardPen className="h-5 w-5" /> Fill Form</>
                )}
              </Button>
              
              {turnstileError ? (
                <button
                  onClick={handleRetryTurnstile}
                  className="text-sm font-medium text-center text-red-500 hover:text-red-600 hover:underline w-full py-2 px-4 border-2 border-red-500/30 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  ⚠️ Verification failed - Click to retry
                </button>
              ) : !turnstileToken && !autoFilling ? (
                <p className="text-[10px] text-center text-muted-foreground">Preparing your session...</p>
              ) : null}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
