import { cn } from "./Button";

interface LanguageToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function LanguageToggle({ checked, onCheckedChange, className }: LanguageToggleProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* US Flag (Left) */}
      <button 
        type="button"
        onClick={() => onCheckedChange(false)}
        className={cn(
          "transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full",
          checked ? "opacity-40 grayscale blur-[0.5px]" : "opacity-100 scale-110 shadow-sm"
        )}
        title="US English"
      >
        <svg width="24" height="24" viewBox="0 0 640 480" className="rounded-full border border-border/20">
          <path fill="#bd3d44" d="M0 0h640v480H0"/>
          <path stroke="#fff" strokeWidth="37" d="M0 55.3h640M0 129h640M0 202.8h640M0 276.5h640M0 350.2h640M0 424h640"/>
          <path fill="#192f5d" d="M0 0h244.8v258.5H0"/>
          <path fill="#fff" d="M46.5 10.5h9.1v9.8h-9.1M65.4 10.5h9.1v9.8h-9.1M84.3 10.5h9.1v9.8h-9.1M103.2 10.5h9.1v9.8h-9.1M122.2 10.5h9.1v9.8h-9.1M141.1 10.5h9.1v9.8h-9.1M160 10.5h9.1v9.8h-9.1M178.9 10.5h9.1v9.8h-9.1M197.8 10.5h9.1v9.8h-9.1M216.7 10.5h9.1v9.8h-9.1M46.5 36.6h9.1v9.8h-9.1M65.4 36.6h9.1v9.8h-9.1M84.3 36.6h9.1v9.8h-9.1M103.2 36.6h9.1v9.8h-9.1M122.2 36.6h9.1v9.8h-9.1M141.1 36.6h9.1v9.8h-9.1M160 36.6h9.1v9.8h-9.1M178.9 36.6h9.1v9.8h-9.1M197.8 36.6h9.1v9.8h-9.1M216.7 36.6h9.1v9.8h-9.1M46.5 62.6h9.1v9.8h-9.1M65.4 62.6h9.1v9.8h-9.1M84.3 62.6h9.1v9.8h-9.1M103.2 62.6h9.1v9.8h-9.1M122.2 62.6h9.1v9.8h-9.1M141.1 62.6h9.1v9.8h-9.1M160 62.6h9.1v9.8h-9.1M178.9 62.6h9.1v9.8h-9.1M197.8 62.6h9.1v9.8h-9.1M216.7 62.6h9.1v9.8h-9.1M46.5 88.7h9.1v9.8h-9.1M65.4 88.7h9.1v9.8h-9.1M84.3 88.7h9.1v9.8h-9.1M103.2 88.7h9.1v9.8h-9.1M122.2 88.7h9.1v9.8h-9.1M141.1 88.7h9.1v9.8h-9.1M160 88.7h9.1v9.8h-9.1M178.9 88.7h9.1v9.8h-9.1M197.8 88.7h9.1v9.8h-9.1M216.7 88.7h9.1v9.8h-9.1M46.5 114.8h9.1v9.8h-9.1M65.4 114.8h9.1v9.8h-9.1M84.3 114.8h9.1v9.8h-9.1M103.2 114.8h9.1v9.8h-9.1M122.2 114.8h9.1v9.8h-9.1M141.1 114.8h9.1v9.8h-9.1M160 114.8h9.1v9.8h-9.1M178.9 114.8h9.1v9.8h-9.1M197.8 114.8h9.1v9.8h-9.1M216.7 114.8h9.1v9.8h-9.1M46.5 140.9h9.1v9.8h-9.1M65.4 140.9h9.1v9.8h-9.1M84.3 140.9h9.1v9.8h-9.1M103.2 140.9h9.1v9.8h-9.1M122.2 140.9h9.1v9.8h-9.1M141.1 140.9h9.1v9.8h-9.1M160 140.9h9.1v9.8h-9.1M178.9 140.9h9.1v9.8h-9.1M197.8 140.9h9.1v9.8h-9.1M216.7 140.9h9.1v9.8h-9.1M46.5 166.9h9.1v9.8h-9.1M65.4 166.9h9.1v9.8h-9.1M84.3 166.9h9.1v9.8h-9.1M103.2 166.9h9.1v9.8h-9.1M122.2 166.9h9.1v9.8h-9.1M141.1 166.9h9.1v9.8h-9.1M160 166.9h9.1v9.8h-9.1M178.9 166.9h9.1v9.8h-9.1M197.8 166.9h9.1v9.8h-9.1M216.7 166.9h9.1v9.8h-9.1M46.5 193h9.1v9.8h-9.1M65.4 193h9.1v9.8h-9.1M84.3 193h9.1v9.8h-9.1M103.2 193h9.1v9.8h-9.1M122.2 193h9.1v9.8h-9.1M141.1 193h9.1v9.8h-9.1M160 193h9.1v9.8h-9.1M178.9 193h9.1v9.8h-9.1M197.8 193h9.1v9.8h-9.1M216.7 193h9.1v9.8h-9.1M46.5 219.1h9.1v9.8h-9.1M65.4 219.1h9.1v9.8h-9.1M84.3 219.1h9.1v9.8h-9.1M103.2 219.1h9.1v9.8h-9.1M122.2 219.1h9.1v9.8h-9.1M141.1 219.1h9.1v9.8h-9.1M160 219.1h9.1v9.8h-9.1M178.9 219.1h9.1v9.8h-9.1M197.8 219.1h9.1v9.8h-9.1M216.7 219.1h9.1v9.8h-9.1M46.5 245.1h9.1v9.8h-9.1M65.4 245.1h9.1v9.8h-9.1M84.3 245.1h9.1v9.8h-9.1M103.2 245.1h9.1v9.8h-9.1M122.2 245.1h9.1v9.8h-9.1M141.1 245.1h9.1v9.8h-9.1M160 245.1h9.1v9.8h-9.1M178.9 245.1h9.1v9.8h-9.1M197.8 245.1h9.1v9.8h-9.1M216.7 245.1h9.1v9.8h-9.1"/>
        </svg>
      </button>

      {/* Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center !rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sketchy-input p-0",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span className="sr-only">Toggle Language</span>
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 bg-background shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
          style={{ borderRadius: '50%' }}
        />
      </button>

      {/* UK Flag (Right) */}
      <button 
        type="button"
        onClick={() => onCheckedChange(true)}
        className={cn(
          "transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full",
          !checked ? "opacity-40 grayscale blur-[0.5px]" : "opacity-100 scale-110 shadow-sm"
        )}
        title="UK English"
      >
        <svg width="24" height="24" viewBox="0 0 640 480" className="rounded-full border border-border/20">
          <path fill="#012169" d="M0 0h640v480H0z"/>
          <path fill="#FFF" d="M75 0l244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
          <path fill="#C8102E" d="M424 281l216 159v40L369 281h55zm-184 20l6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/>
          <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
          <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
        </svg>
      </button>
    </div>
  );
}
