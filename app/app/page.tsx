import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export default function AppPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-background to-surface">
      <OnboardingFlow version="v1" />
    </div>
  );
}

