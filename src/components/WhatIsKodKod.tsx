import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function WhatIsKodKod() {
  const [isExpanded, setIsExpanded] = useState(false);

  const features = [
    'AI-tailored resumes for each job',
    'ATS-friendly formatting',
    'Cover letters included',
    'Works on any job board',
  ];

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors w-full py-2"
      >
        What is KodKod?
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="mt-2 p-4 bg-card border rounded-lg text-left space-y-3 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-foreground">
            <span className="font-semibold">KodKod</span> is an AI resume generator that creates
            tailored resumes from your master profile for any job description.
          </p>

          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground pt-2 border-t">
            Stop rewriting your resume for every application. Create once, generate forever.
          </p>
        </div>
      )}
    </div>
  );
}
