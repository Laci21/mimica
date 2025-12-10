'use client';

import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { useSearchParams } from 'next/navigation';

export default function AppPage() {
  const searchParams = useSearchParams();
  const version = (searchParams.get('version') as 'v1' | 'v2') || 'v1';
  
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-background to-surface">
      <OnboardingFlow version={version} />
    </div>
  );
}

