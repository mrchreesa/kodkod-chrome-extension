import { FileText } from 'lucide-react';

export function SampleResumePreview() {
  return (
    <div className="relative w-full max-w-[200px] mx-auto">
      {/* Resume mockup */}
      <div className="bg-white rounded shadow-lg p-3 border transform rotate-1 hover:rotate-0 transition-transform">
        {/* Header */}
        <div className="border-b pb-2 mb-2">
          <div className="h-3 w-24 bg-slate-800 rounded-sm mb-1" />
          <div className="flex gap-2">
            <div className="h-1.5 w-16 bg-slate-300 rounded-sm" />
            <div className="h-1.5 w-12 bg-slate-300 rounded-sm" />
          </div>
        </div>

        {/* Summary */}
        <div className="mb-2">
          <div className="h-1.5 w-12 bg-slate-600 rounded-sm mb-1" />
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-slate-200 rounded-sm" />
            <div className="h-1 w-full bg-slate-200 rounded-sm" />
            <div className="h-1 w-3/4 bg-slate-200 rounded-sm" />
          </div>
        </div>

        {/* Experience */}
        <div className="mb-2">
          <div className="h-1.5 w-16 bg-slate-600 rounded-sm mb-1" />
          <div className="space-y-1">
            <div>
              <div className="h-1.5 w-20 bg-slate-400 rounded-sm mb-0.5" />
              <div className="h-1 w-full bg-slate-200 rounded-sm" />
              <div className="h-1 w-5/6 bg-slate-200 rounded-sm" />
            </div>
            <div>
              <div className="h-1.5 w-18 bg-slate-400 rounded-sm mb-0.5" />
              <div className="h-1 w-full bg-slate-200 rounded-sm" />
              <div className="h-1 w-4/5 bg-slate-200 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <div className="h-1.5 w-10 bg-slate-600 rounded-sm mb-1" />
          <div className="flex flex-wrap gap-1">
            <div className="h-2 w-8 bg-primary/20 rounded-sm" />
            <div className="h-2 w-10 bg-primary/20 rounded-sm" />
            <div className="h-2 w-6 bg-primary/20 rounded-sm" />
            <div className="h-2 w-9 bg-primary/20 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Decorative badge */}
      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[8px] font-bold px-2 py-1 rounded-full shadow-md transform rotate-12">
        AI Generated
      </div>

      {/* Label */}
      <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
        <FileText className="h-3 w-3" />
        <span>Tailored to each job</span>
      </div>
    </div>
  );
}
