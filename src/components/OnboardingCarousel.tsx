import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileUser, ClipboardList, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingCarouselProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: FileUser,
    title: 'Create Your Master Profile',
    description: 'Build a complete profile with all your experience, skills, and achievements. Do this once, use it forever.',
    highlight: 'One-time setup',
  },
  {
    icon: ClipboardList,
    title: 'Paste Any Job Description',
    description: 'Found a job you love? Just paste the description or let us auto-fill it from job board pages.',
    highlight: 'Works on any job site',
  },
  {
    icon: Sparkles,
    title: 'Get a Tailored Resume',
    description: 'Our AI crafts a perfectly tailored resume highlighting the most relevant experience for each role.',
    highlight: 'ATS-optimized',
  },
];

export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>

        <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
          {slide.highlight}
        </span>

        <h3 className="text-lg font-bold font-hand text-center mb-2">
          {slide.title}
        </h3>

        <p className="text-sm text-muted-foreground text-center max-w-[260px]">
          {slide.description}
        </p>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-primary w-6'
                : 'bg-primary/30 hover:bg-primary/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 pb-4">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="p-2 rounded-full hover:bg-muted disabled:opacity-0 disabled:pointer-events-none transition-opacity"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={nextSlide}
          className="sketchy-button flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm"
        >
          {currentSlide === slides.length - 1 ? (
            <>
              Get Started <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Next <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>

        {currentSlide < slides.length - 1 && (
          <button
            onClick={onComplete}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}

        {currentSlide === slides.length - 1 && (
          <div className="w-10" />
        )}
      </div>
    </div>
  );
}
