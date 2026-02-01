
import { useEffect, useState } from 'react';
import { fetchProfiles, generateResume, fetchCredits, fillForm, type Profile, type CreditData } from './lib/api';
import { Loader2, Sparkles, FileText, LogIn, Download, RefreshCw, Moon, Sun, Coins, X, ClipboardPen, CheckCircle2 } from 'lucide-react';
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

export default function KodKodApp() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [coverLetterHtml, setCoverLetterHtml] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditData | null>(null);
  const { theme, setTheme } = useTheme();
  
  // Auto-fill state
  const [isApplicationPage, setIsApplicationPage] = useState(false);
  const [applicationPlatform, setApplicationPlatform] = useState<string | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillResult, setAutoFillResult] = useState<{ filled: number; failed: number } | null>(null);
  const [autoFillStep, setAutoFillStep] = useState<string>('');
  
  // Generation Options - Initialize from localStorage if available
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

  // Track onboarding completion
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    return localStorage.getItem('kodkod_hasSeenOnboarding') === 'true';
  });

  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    localStorage.setItem('kodkod_hasSeenOnboarding', 'true');
  };

  // Use localhost for dev, production URL for prod
  const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://www.kodkodai.com';
  const TURNSTILE_URL = `${BASE_URL}/turnstile-only`;

  useEffect(() => {
    checkAuth();
    checkApplicationPage();
    
    // Listen for Turnstile token
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TURNSTILE_TOKEN') {
        setTurnstileToken(event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Check if current page is an application form
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
      // Content script might not be loaded yet
      console.log('Could not check application page:', e);
    }
  };

  // Persist settings when they change
  useEffect(() => {
    localStorage.setItem('kodkod_skipSummary', JSON.stringify(skipSummary));
    localStorage.setItem('kodkod_useUKEnglish', JSON.stringify(useUKEnglish));
    localStorage.setItem('kodkod_includeCoverLetter', JSON.stringify(includeCoverLetter));
    localStorage.setItem('kodkod_coverLetterOnly', JSON.stringify(coverLetterOnly));
    localStorage.setItem('kodkod_selectedTemplate', selectedTemplate);
  }, [skipSummary, useUKEnglish, includeCoverLetter, coverLetterOnly, selectedTemplate]);

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
        
        // Check if content is too short or empty
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
        
        setJobDescription(content);
        if (response.source && response.source !== 'generic') {
          setScrapeSource(response.source);
        }
      } else {
        setError('No content found. Please refresh the page and make sure it\'s fully loaded, then try again.');
      }
    } catch (e) {
      console.error(e);
      setError('Could not access page content. Please refresh the page and try again.');
    }
  };

  const [companyName, setCompanyName] = useState<string>('');
  const [scrapeSource, setScrapeSource] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0); // Used to force re-render iframe

  const generationSteps = coverLetterOnly ? [
    'Analyzing job requirements...',
    'Crafting your message...',
    'Formatting cover letter...',
  ] : [
    'Analyzing job requirements...',
    'Matching your experience...',
    'Formatting resume...',
  ];

  const handleGenerate = async () => {
    if (profiles.length === 0 || !jobDescription || !turnstileToken) return;
    setGenerating(true);
    setError(null);
    setGenerationStep(generationSteps[0]);

    // Progress through steps with timing
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < generationSteps.length) {
        setGenerationStep(generationSteps[stepIndex]);
      }
    }, 2500); // Move to next step every 2.5 seconds

    try {
      const result = await generateResume({
        masterProfileId: profiles[0].id, // Use first profile
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
      setCompanyName(result.companyName || '');

      // Refetch credits to update the UI
      const newCredits = await fetchCredits();
      setCredits(newCredits);

    } catch (err: any) {
      setError(err.message);
      setTurnstileError(true);
    } finally {
      clearInterval(stepInterval);
      setGenerating(false);
      setGenerationStep('');
      setTurnstileToken(null); // Token is single use
    }
  };

  const handleRetryTurnstile = () => {
    setTurnstileError(false);
    setTurnstileKey(prev => prev + 1); // Force iframe to reload
  };

  // Auto-fill form handler
  const autoFillSteps = [
    'Scanning form fields...',
    'Matching your profile...',
    'Filling application...',
  ];

  const handleAutoFill = async () => {
    if (profiles.length === 0 || !turnstileToken) return;
    
    setAutoFilling(true);
    setError(null);
    setAutoFillResult(null);
    setAutoFillStep(autoFillSteps[0]);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      // Step 1: Scrape form fields
      const scrapeResponse = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeFormFields' });
      if (!scrapeResponse?.fields || scrapeResponse.fields.length === 0) {
        throw new Error('No form fields found on this page');
      }

      setAutoFillStep(autoFillSteps[1]);

      // Step 2: Get fill values from API
      const fillResponse = await fillForm({
        fields: scrapeResponse.fields,
        masterProfileId: profiles[0].id,
        turnstileToken,
        companyName: applicationPlatform || undefined,
      });

      if (!fillResponse.success) {
        throw new Error('Failed to generate form values');
      }

      setAutoFillStep(autoFillSteps[2]);

      // Step 3: Fill the form
      const fillResult = await chrome.tabs.sendMessage(tab.id, { 
        action: 'fillForm', 
        values: fillResponse.values 
      });

      setAutoFillResult({
        filled: fillResult.filled || 0,
        failed: fillResult.failed || 0,
      });

      // Refetch credits
      const newCredits = await fetchCredits();
      setCredits(newCredits);

    } catch (err: any) {
      setError(err.message);
      setTurnstileError(true);
    } finally {
      setAutoFilling(false);
      setAutoFillStep('');
      setTurnstileToken(null); // Token is single use
    }
  };
  
  const handleDownloadResume = () => {
    if (!generatedHtml) return;
    
    // Extract name for title
    const titleMatch = generatedHtml.match(/<title>([^<]+)<\/title>/);
    const userName = titleMatch ? titleMatch[1] : 'Resume';
    
    // Format: Resume - [Name] - [Company]
    const title = companyName 
      ? `Resume - ${userName} - ${companyName}`
      : `Resume - ${userName}`;
    
    // Save content and title to localStorage
    localStorage.setItem('kodkod_print_content', generatedHtml);
    localStorage.setItem('kodkod_print_title', title);
    
    // Open the print page
    window.open(chrome.runtime.getURL('print.html'), '_blank');
  };

  const handleDownloadCoverLetter = () => {
    if (!coverLetterHtml) return;
    
    // Extract name for title
    const titleMatch = coverLetterHtml.match(/<title>[^<]+ - ([^<]+)<\/title>/);
    const userName = titleMatch ? titleMatch[1] : 'Cover Letter';
    
    // Format: Cover Letter - [Name] - [Company]
    const title = companyName
      ? `Cover Letter - ${userName} - ${companyName}`
      : `Cover Letter - ${userName}`;
    
    // Save content and title to localStorage
    localStorage.setItem('kodkod_print_content', coverLetterHtml);
    localStorage.setItem('kodkod_print_title', title);
    
    // Open the print page
    window.open(chrome.runtime.getURL('print.html'), '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profiles.length === 0 && !loading && !error) {
    // Show onboarding carousel for first-time users
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

    // Show login screen after onboarding
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="w-24 mx-auto">
            <img src="/name-light.png" alt="KodKod" className="w-full dark:hidden" />
            <img src="/name.png" alt="KodKod" className="w-full hidden dark:block" />
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col">
          {/* Value proposition */}
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-xl font-bold font-hand">Welcome to KodKod</h2>
            <p className="text-muted-foreground text-sm">
              Create tailored resumes in seconds
            </p>
          </div>

          {/* Sample resume preview */}
          <div className="mb-6">
            <SampleResumePreview />
          </div>

          {/* Login CTA */}
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

            {/* What is KodKod expandable section */}
            <WhatIsKodKod />
          </div>
        </div>
      </div>
    );
  }

  if (generatedHtml || coverLetterHtml) {
    return (
      <div className="p-4 h-screen flex flex-col bg-background">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Generated!
          </h2>
          <Button variant="ghost" size="sm" onClick={() => { setGeneratedHtml(null); setCoverLetterHtml(null); }}>
            Back
          </Button>
        </div>
        
        <div className="flex-1 flex flex-col gap-4 overflow-hidden mb-4">
          {generatedHtml && (
            <Card className="flex-1 overflow-hidden relative border-2 flex flex-col">
               <div className="bg-muted/50 px-3 py-1 text-[10px] font-medium text-muted-foreground border-b flex justify-between items-center">
                 <span>Resume</span>
               </div>
               <iframe srcDoc={generatedHtml} className="w-full flex-1 border-0 bg-white" title="Resume Preview" />
            </Card>
          )}
          
          {coverLetterHtml && (
            <Card className="flex-1 overflow-hidden relative border-2 flex flex-col">
               <div className="bg-muted/50 px-3 py-1 text-[10px] font-medium text-muted-foreground border-b flex justify-between items-center">
                 <span>Cover Letter</span>
               </div>
               <iframe srcDoc={coverLetterHtml} className="w-full flex-1 border-0 bg-white" title="Cover Letter Preview" />
            </Card>
          )}
        </div>
        
        <div className="flex gap-2">
          {generatedHtml && (
            <Button
              onClick={handleDownloadResume}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" /> Resume PDF
            </Button>
          )}
          
          {coverLetterHtml && (
            <Button
              onClick={handleDownloadCoverLetter}
              className={`flex-1 gap-2 ${!generatedHtml ? '' : ''}`}
              variant={generatedHtml ? 'outline' : 'default'}
            >
              <Download className="h-4 w-4" /> Cover Letter
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="w-24">
            <img src="/name-light.png" alt="KodKod" className="w-full dark:hidden" />
            <img src="/name.png" alt="KodKod" className="w-full hidden dark:block" />
          </div>
          <div className="flex items-center gap-2">
            {credits && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10">
                <Coins className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {credits.isUnlimited ? '∞' : credits.credits}
                </span>
              </div>
            )}
            <button
              onClick={checkAuth}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
           
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        {/* Auto-fill result banner */}
        {autoFillResult && (
          <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-500/20 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Filled {autoFillResult.filled} field{autoFillResult.filled !== 1 ? 's' : ''}
              {autoFillResult.failed > 0 && ` (${autoFillResult.failed} couldn't be filled)`}
            </span>
            <button 
              onClick={() => setAutoFillResult(null)}
              className="ml-auto hover:text-green-700 dark:hover:text-green-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {autoFilling ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-border rounded-lg bg-gradient-to-br from-blue-500/5 via-background to-blue-500/10">
            <div className="text-center space-y-5 p-6">
              {/* Animated Form Fill Icon */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl" style={{ animation: 'pulse-ring 2s infinite' }} />
                <div className="relative bg-background border-2 border-blue-500/50 rounded-lg p-3 shadow-lg" style={{ animation: 'gentle-float 3s infinite ease-in-out' }}>
                  <ClipboardPen className="w-8 h-8 text-blue-500" style={{ animation: 'write-motion 1.5s infinite ease-in-out' }} />
                </div>
              </div>

              {/* Main text */}
              <div className="space-y-1">
                <h3 className="text-foreground font-semibold text-base">Auto-Filling Application</h3>
                <p className="text-muted-foreground text-xs">{autoFillStep}</p>
              </div>

              {/* Form fields animation */}
              <div className="w-48 mx-auto space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2" style={{ animationDelay: `${i * 0.3}s` }}>
                    <div className="w-12 h-2 bg-muted rounded" />
                    <div 
                      className="flex-1 h-3 bg-muted rounded overflow-hidden"
                      style={{ animation: `fill-field 2s infinite`, animationDelay: `${i * 0.4}s` }}
                    >
                      <div 
                        className="h-full bg-blue-500/50 rounded"
                        style={{ animation: `fill-progress 2s infinite ease-out`, animationDelay: `${i * 0.4}s` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress steps */}
              <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${autoFillSteps.indexOf(autoFillStep) >= 0 ? 'bg-blue-500 animate-pulse' : 'bg-blue-500/30'}`} />
                  Scanning
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${autoFillSteps.indexOf(autoFillStep) >= 1 ? 'bg-blue-500 animate-pulse' : 'bg-blue-500/30'}`} />
                  Matching
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${autoFillSteps.indexOf(autoFillStep) >= 2 ? 'bg-blue-500 animate-pulse' : 'bg-blue-500/30'}`} />
                  Filling
                </span>
              </div>
            </div>

            {/* Form fill specific keyframes */}
            <style>{`
              @keyframes pulse-ring {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.1); opacity: 0.2; }
              }
              @keyframes gentle-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }
              @keyframes write-motion {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-5deg); }
                75% { transform: rotate(5deg); }
              }
              @keyframes fill-progress {
                0% { width: 0%; }
                50% { width: 100%; }
                100% { width: 100%; }
              }
            `}</style>
          </div>
        ) : generating ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-border rounded-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
            <div className="text-center space-y-5 p-6">
              {/* Animated Icon */}
              <div className="relative mx-auto">
                <img
                  src="/star.png"
                  alt=""
                  className="w-20 h-20 mx-auto"
                  style={{ animation: 'slow-bounce 2s infinite' }}
                />
              </div>

              {/* Main text */}
              <div className="space-y-1">
                <h3 className="text-foreground font-semibold text-base">
                  {autoFilling ? 'Auto-Filling Application' : coverLetterOnly ? 'Generating Your Cover Letter' : 'Generating Your Resume'}
                </h3>
                <p className="text-muted-foreground text-xs">
                  {autoFilling ? autoFillStep : generationStep}
                </p>
              </div>

              {/* Animated shimmer progress bar */}
              <div className="w-48 mx-auto">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full relative overflow-hidden bg-primary/50"
                    style={{ width: '100%' }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
                        width: '50%',
                        height: '100%',
                        animation: 'shimmer-slide 1.5s infinite linear'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Progress steps with pulsing dots */}
              <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${generationSteps.indexOf(generationStep) >= 0 ? 'bg-primary' : 'bg-primary/30'}`} />
                  Analyzing
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${generationSteps.indexOf(generationStep) >= 1 ? 'bg-primary' : 'bg-primary/30'}`} style={{ animationDelay: '0.5s' }} />
                  Matching
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${generationSteps.indexOf(generationStep) >= 2 ? 'bg-primary' : 'bg-primary/30'}`} style={{ animationDelay: '1s' }} />
                  Formatting
                </span>
              </div>
            </div>

            {/* Keyframes for animations */}
            <style>{`
              @keyframes flash {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(0.9); }
              }
              @keyframes shimmer-slide {
                0% { transform: translateX(-200%); }
                100% { transform: translateX(300%); }
              }
              @keyframes slow-bounce {
                0%, 100% {
                  transform: translateY(-25%);
                  animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
                }
                50% {
                  transform: translateY(0);
                  animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
                }
              }
            `}</style>
          </div>
        ) : (
          <>
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Job Description</label>
          </div>
          <div className="relative flex-1 flex flex-col">
            <Textarea
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setScrapeSource(null);
              }}
              placeholder="Paste job description..."
              className="flex-1 min-h-[100px] font-mono text-sm pr-8"
            />
            {jobDescription && (
              <button
                onClick={() => {
                  setJobDescription('');
                  setScrapeSource(null);
                }}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear job description"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrape}
              className="w-full text-xs gap-1"
            >
              <FileText className="h-3 w-3" /> Get from Page
            </Button>
            {scrapeSource ? (
              <p className="text-[10px] text-primary text-center font-medium">
                Extracted from {scrapeSource}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground text-center">
                Auto-fill job description from the current tab.
              </p>
            )}
          </div>
        </div>

        <div className={`space-y-2 transition-opacity ${coverLetterOnly ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Resume Template</label>
          <Select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            disabled={coverLetterOnly}
          >
            <option value="harvard">Harvard Style (Classic)</option>
            <option value="modern">Hybrid (Modern)</option>
            <option value="minimal">Creative (Minimal)</option>
          </Select>
        </div>

        {/* Cover Letter Only Toggle */}
        <div className="p-4 border rounded-lg bg-card/50">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCoverLetterOnly(!coverLetterOnly)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                coverLetterOnly ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  coverLetterOnly ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-medium">Cover Letter Only</p>
              <p className="text-[10px] text-muted-foreground">Generate only a cover letter, no resume</p>
            </div>
          </div>
        </div>

        <div className={`space-y-3 p-4 border rounded-lg bg-card/50 transition-opacity ${coverLetterOnly ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="skipSummary" 
                checked={skipSummary}
                onCheckedChange={(checked) => setSkipSummary(checked as boolean)}
                disabled={coverLetterOnly}
              />
              <label
                htmlFor="skipSummary"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Skip Summary
              </label>
            </div>
            
            <LanguageToggle 
              checked={useUKEnglish}
              onCheckedChange={setUseUKEnglish}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="coverLetter" 
              checked={includeCoverLetter}
              onCheckedChange={(checked) => setIncludeCoverLetter(checked as boolean)}
              disabled={coverLetterOnly}
            />
            <label
              htmlFor="coverLetter"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include Cover Letter
            </label>
          </div>
        </div>
          </>
        )}

        {/* Hidden Turnstile Iframe */}
        <div className="h-0 overflow-hidden opacity-0 absolute">
          {!turnstileToken && !turnstileError && (
            <iframe key={turnstileKey} src={TURNSTILE_URL} className="w-[300px] h-[65px]" />
          )}
        </div>

        <div className="sticky bottom-0 bg-background pt-2 pb-4 mt-auto space-y-2">
          {/* Auto-Fill Button - Only show on application pages */}
          {isApplicationPage && (
            <Button
              onClick={handleAutoFill}
              disabled={autoFilling || generating || profiles.length === 0 || !turnstileToken}
              variant="outline"
              className="w-full gap-2 h-11 border-2 border-primary/50 hover:border-primary hover:bg-primary/5"
            >
              {autoFilling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Filling Application...
                </>
              ) : (
                <>
                  <ClipboardPen className="h-4 w-4" /> Auto-Fill Application
                  {applicationPlatform && (
                    <span className="text-xs text-muted-foreground">({applicationPlatform})</span>
                  )}
                </>
              )}
            </Button>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || autoFilling || profiles.length === 0 || !jobDescription || !turnstileToken}
            className="w-full gap-2 text-lg h-12 shadow-lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Generating...
              </>
            ) : coverLetterOnly ? (
              <>
                <Sparkles className="h-5 w-5" /> Generate Cover Letter
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> Generate Resume
              </>
            )}
          </Button>

          {turnstileError ? (
            <button
              onClick={handleRetryTurnstile}
              className="text-sm font-medium text-center text-red-500 hover:text-red-600 hover:underline mt-2 w-full py-2 px-4 border-2 border-red-500/30 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              ⚠️ Verification failed — Click to retry
            </button>
          ) : !turnstileToken && !generating && !autoFilling ? (
            <p className="text-[10px] text-center text-muted-foreground mt-2">Preparing your session...</p>
          ) : !generating && !autoFilling ? (
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              {isApplicationPage ? 'Ready to auto-fill or generate resume!' : 'Ready to generate your resume!'}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
