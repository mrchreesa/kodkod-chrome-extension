const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : 'https://www.kodkodai.com';

export interface Profile {
  id: string;
  name: string;
  updated_at: string;
}

console.log(API_BASE_URL);
export async function fetchProfiles(): Promise<Profile[]> {
  const response = await fetch(`${API_BASE_URL}/api/profiles`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  
  if (!response.ok) {
    throw new Error('Failed to fetch profiles');
  }
  
  const data = await response.json();
  return data.profiles;
}

export interface GenerateResumeParams {
  masterProfileId: string;
  jobDescription: string;
  template: string;
  includeCoverLetter: boolean;
  coverLetterOnly?: boolean;
  turnstileToken: string;
  skipSummary?: boolean;
  useUKEnglish?: boolean;
}

export interface GenerateResumeResponse {
  success: boolean;
  resumeId: string;
  html: string | null;
  coverLetterHtml: string | null;
  jobTitle: string;
  companyName: string;
  tailoredResume: any;
}

export async function generateResume(data: GenerateResumeParams): Promise<GenerateResumeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate resume');
  }
  
  return response.json();
}

export async function scrapeUrl(url: string) {
  const response = await fetch(`${API_BASE_URL}/api/scrape-job`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     throw new Error(errorData.error || 'Failed to scrape URL');
  }

  return response.json();
}

export interface CreditData {
  credits: number;
  lifetimeEarned: number;
  plan: string;
  isUnlimited: boolean;
  status: string;
}

export async function fetchCredits(): Promise<CreditData> {
  const response = await fetch(`${API_BASE_URL}/api/credits`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  
  if (!response.ok) {
    throw new Error('Failed to fetch credits');
  }
  
  return response.json();
}

// Form Auto-Fill Types and API
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string; // 'text', 'textarea', 'radio', 'email', 'tel', etc.
  options?: { value: string; text: string }[]; // For radio buttons
  required: boolean;
  placeholder?: string;
  currentValue?: string;
  selector?: string;
}

export interface FormFillParams {
  fields: FormField[];
  masterProfileId: string;
  turnstileToken: string;
  jobTitle?: string;
  companyName?: string;
}

export interface FormFillResponse {
  success: boolean;
  values: Record<string, string>;
  fieldsProvided: number;
  fieldsFilled: number;
}

export async function fillForm(data: FormFillParams): Promise<FormFillResponse> {
  const response = await fetch(`${API_BASE_URL}/api/form-fill`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fill form');
  }

  return response.json();
}

// Form Agent API (with memory and learning)
export interface FormAgentFillParams {
  fields: FormField[];
  masterProfileId: string;
  turnstileToken: string;
  sessionId?: string;
  jobUrl?: string;
  jobDescription?: string;
  jobTitle?: string;
  companyName?: string;
}

export interface FormAgentFillResponse {
  success: boolean;
  sessionId: string;
  values: Record<string, string>;
  sources: Record<string, 'memory' | 'ai' | 'profile'>;
  fieldsProvided: number;
  fieldsFilled: number;
  memoriesUsed: number;
  creditCharged: boolean;
}

export async function formAgentFill(data: FormAgentFillParams): Promise<FormAgentFillResponse> {
  const response = await fetch(`${API_BASE_URL}/api/form-agent`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'fill',
      ...data,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fill form');
  }

  return response.json();
}

export interface FormLearning {
  questionText: string;
  fieldType: string;
  agentValue?: string;
  finalValue: string;
  options?: { value: string; text: string }[];
  type: 'new' | 'accepted' | 'corrected';
}

export interface FormAgentLearnParams {
  learnings: FormLearning[];
  sessionId?: string;
}

export interface FormAgentLearnResponse {
  success: boolean;
  learned: number;
  reinforced: number;
  corrected: number;
}

export async function formAgentLearn(data: FormAgentLearnParams): Promise<FormAgentLearnResponse> {
  const response = await fetch(`${API_BASE_URL}/api/form-agent`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'learn',
      ...data,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save learnings');
  }

  return response.json();
}

// Answer a question and optionally save to memory
export interface FormAgentAnswerParams {
  question: string;
  masterProfileId: string;
  turnstileToken: string;
  saveToMemory?: boolean;
}

export interface FormAgentAnswerResponse {
  success: boolean;
  answer: string;
  saved: boolean;
}

export async function formAgentAnswer(data: FormAgentAnswerParams): Promise<FormAgentAnswerResponse> {
  const response = await fetch(`${API_BASE_URL}/api/form-agent`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'answer',
      ...data,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate answer');
  }

  return response.json();
}
