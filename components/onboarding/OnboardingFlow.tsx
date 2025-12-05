'use client';

import { useState, useEffect } from 'react';

export type UIVersion = 'v1' | 'v2';

interface OnboardingFlowProps {
  version?: UIVersion;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
  highlightElementId?: string;
  simulationStep?: number; // Controlled step from simulation
  simulationAction?: { elementId: string; action: string }; // Action to perform
}

export default function OnboardingFlow({
  version = 'v1',
  onStepChange,
  onComplete,
  highlightElementId,
  simulationStep,
  simulationAction,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    goal: '',
    engagement: '',
    notifications: [] as string[],
    confirmed: false,
  });

  // When controlled by simulation, sync the step
  useEffect(() => {
    if (simulationStep !== undefined && simulationStep !== currentStep) {
      console.log('🎯 OnboardingFlow: Updating step from', currentStep, 'to', simulationStep);
      setCurrentStep(simulationStep);
    }
  }, [simulationStep, currentStep]);

  // Handle simulation actions (clicking, selecting, etc.)
  useEffect(() => {
    if (!simulationAction) return;

    const { elementId, action } = simulationAction;

    // Handle goal selection
    if (elementId.startsWith('goal-option-')) {
      const goal = elementId.replace('goal-option-', '').replace('-v2', '');
      setFormData(prev => ({ ...prev, goal }));
    }
    // Handle notification checkboxes
    else if (elementId.startsWith('notification-')) {
      const notificationId = elementId.replace('notification-', '').replace('-v2', '');
      if (action === 'CLICK') {
        setFormData(prev => ({
          ...prev,
          notifications: prev.notifications.includes(notificationId)
            ? prev.notifications.filter(n => n !== notificationId)
            : [...prev.notifications, notificationId]
        }));
      }
    }
    // Handle engagement slider
    else if (elementId.includes('intensity-slider') || elementId.includes('guidance-level-slider')) {
      setFormData(prev => ({ ...prev, engagement: '3' }));
    }
  }, [simulationAction]);

  const handleNext = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    onStepChange?.(nextStep);
    
    if (nextStep >= 4) {
      onComplete?.();
    }
  };

  const handlePrev = () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    onStepChange?.(prevStep);
  };

  const isHighlighted = (elementId: string) => {
    return highlightElementId === elementId;
  };

  const highlightClass = 'ring-4 ring-accent ring-opacity-50 animate-pulse';

  // Version 1: Intentionally confusing UI
  if (version === 'v1') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-surface border border-border rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to FocusFlow</h1>
            <p className="text-foreground/60 text-sm">
              Configure your experience
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              {[0, 1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-12 rounded-full ${
                    step === currentStep
                      ? 'bg-accent'
                      : step < currentStep
                      ? 'bg-accent/50'
                      : 'bg-surface-light'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step 0: Goal Selection (Improved clarity) */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  What brings you here?
                </h2>
                <p className="text-sm text-foreground/60 mb-4">
                  Choose your main goal so we can personalize your experience
                </p>
                <div className="space-y-3">
                  <button
                    data-element-id="goal-option-maximize"
                    className={`w-full p-4 text-left rounded-lg border transition-all ${
                      formData.goal === 'maximize'
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-background hover:bg-surface-light'
                    } ${isHighlighted('goal-option-maximize') ? highlightClass : ''}`}
                    onClick={() => setFormData({ ...formData, goal: 'maximize' })}
                  >
                    <div className="font-semibold">Get More Done</div>
                    <div className="text-sm text-foreground/60">
                      Complete more tasks and boost your daily output
                    </div>
                  </button>
                  <button
                    data-element-id="goal-option-optimize"
                    className={`w-full p-4 text-left rounded-lg border transition-all ${
                      formData.goal === 'optimize'
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-background hover:bg-surface-light'
                    } ${isHighlighted('goal-option-optimize') ? highlightClass : ''}`}
                    onClick={() => setFormData({ ...formData, goal: 'optimize' })}
                  >
                    <div className="font-semibold">Work Smarter</div>
                    <div className="text-sm text-foreground/60">
                      Find better ways to organize and prioritize tasks
                    </div>
                  </button>
                  <button
                    data-element-id="goal-option-balance"
                    className={`w-full p-4 text-left rounded-lg border transition-all ${
                      formData.goal === 'balance'
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-background hover:bg-surface-light'
                    } ${isHighlighted('goal-option-balance') ? highlightClass : ''}`}
                    onClick={() => setFormData({ ...formData, goal: 'balance' })}
                  >
                    <div className="font-semibold">Balance Work & Life</div>
                    <div className="text-sm text-foreground/60">
                      Maintain healthy boundaries and prevent burnout
                    </div>
                  </button>
                </div>
              </div>
              <button
                data-element-id="step0-continue"
                disabled={!formData.goal}
                onClick={handleNext}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  formData.goal
                    ? 'bg-accent hover:bg-accent-light'
                    : 'bg-surface-light text-foreground/40 cursor-not-allowed'
                } ${isHighlighted('step0-continue') ? highlightClass : ''}`}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 1: Focus Preferences (Improved clarity) */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Focus Preferences</h2>
                <p className="text-sm text-foreground/60 mb-4">
                  How much do you want FocusFlow to guide you?
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground/90 block mb-2">
                      Guidance Level
                    </label>
                    <input
                      data-element-id="engagement-intensity-slider"
                      type="range"
                      min="1"
                      max="5"
                      defaultValue="3"
                      className={`w-full mt-2 ${
                        isHighlighted('engagement-intensity-slider') ? highlightClass : ''
                      }`}
                      onChange={(e) =>
                        setFormData({ ...formData, engagement: e.target.value })
                      }
                    />
                    <div className="flex justify-between text-xs text-foreground/60 mt-2">
                      <span>Less guidance</span>
                      <span>Moderate</span>
                      <span>More guidance</span>
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        data-element-id="engagement-adaptive-toggle"
                        type="checkbox"
                        className={`mt-1 rounded ${
                          isHighlighted('engagement-adaptive-toggle') ? highlightClass : ''
                        }`}
                      />
                      <div>
                        <span className="text-sm font-medium">Smart Adjustments</span>
                        <p className="text-xs text-foreground/60 mt-1">
                          Let FocusFlow learn from your habits and adjust settings automatically
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  data-element-id="step1-back"
                  onClick={handlePrev}
                  className={`px-6 py-3 rounded-lg font-semibold border border-border hover:bg-surface-light transition-all ${
                    isHighlighted('step1-back') ? highlightClass : ''
                  }`}
                >
                  Back
                </button>
                <button
                  data-element-id="step1-continue"
                  onClick={handleNext}
                  className={`flex-1 py-3 rounded-lg font-semibold bg-accent hover:bg-accent-light transition-all ${
                    isHighlighted('step1-continue') ? highlightClass : ''
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Notifications (Improved hierarchy) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Stay Informed
                </h2>
                <p className="text-sm text-foreground/60 mb-4">
                  Choose what updates you&apos;d like to receive (you can change this later)
                </p>
                <div className="space-y-3">
                  {[
                    { id: 'updates', label: 'Important updates', desc: 'New features and fixes' },
                    { id: 'tips', label: 'Productivity tips', desc: 'Weekly suggestions to improve' },
                    { id: 'reports', label: 'Weekly progress', desc: 'Summary of your achievements' },
                  ].map((option) => (
                    <label
                      key={option.id}
                      data-element-id={`notification-${option.id}`}
                      className={`flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-light cursor-pointer ${
                        isHighlighted(`notification-${option.id}`) ? highlightClass : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={formData.notifications.includes(option.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              notifications: [...formData.notifications, option.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              notifications: formData.notifications.filter(
                                (n) => n !== option.id
                              ),
                            });
                          }
                        }}
                      />
                      <div>
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-foreground/50">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  data-element-id="step2-back"
                  onClick={handlePrev}
                  className={`px-6 py-3 rounded-lg font-semibold border border-border hover:bg-surface-light transition-all ${
                    isHighlighted('step2-back') ? highlightClass : ''
                  }`}
                >
                  Back
                </button>
                <button
                  data-element-id="step2-skip"
                  onClick={handleNext}
                  className={`flex-1 py-3 rounded-lg font-semibold bg-accent hover:bg-accent-light transition-all ${
                    isHighlighted('step2-skip') ? highlightClass : ''
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Review & Confirm</h2>
                <div className="space-y-3 bg-background rounded-lg p-4 border border-border">
                  <div>
                    <div className="text-xs text-foreground/50">Objective</div>
                    <div className="font-medium">{formData.goal || 'Not selected'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-foreground/50">Engagement</div>
                    <div className="font-medium">
                      {formData.engagement
                        ? `Level ${formData.engagement}`
                        : 'Not configured'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-foreground/50">Notifications</div>
                    <div className="font-medium">
                      {formData.notifications.length} preferences selected
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  data-element-id="step3-back"
                  onClick={handlePrev}
                  className={`flex-1 py-3 rounded-lg font-semibold border border-border hover:bg-surface-light transition-all ${
                    isHighlighted('step3-back') ? highlightClass : ''
                  }`}
                >
                  Go Back
                </button>
                <button
                  data-element-id="step3-finish"
                  onClick={handleNext}
                  className={`flex-1 py-3 rounded-lg font-semibold bg-accent hover:bg-accent-light transition-all ${
                    isHighlighted('step3-finish') ? highlightClass : ''
                  }`}
                >
                  Finish Setup
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">All Set!</h2>
                <p className="text-foreground/60">
                  Your FocusFlow experience is configured
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Version 2: Improved UI based on TKF insights
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface border border-border rounded-xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to FocusFlow</h1>
          <p className="text-foreground/60 text-sm">
            Let&apos;s personalize your focus experience
          </p>
          <div className="mt-4 flex gap-2 justify-center">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 w-12 rounded-full ${
                  step === currentStep
                    ? 'bg-accent'
                    : step < currentStep
                    ? 'bg-accent/50'
                    : 'bg-surface-light'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 0: Goal Selection (Clearer labels) */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">What brings you here?</h2>
              <p className="text-sm text-foreground/60 mb-4">
                Choose your main goal so we can personalize your experience
              </p>
              <div className="space-y-3">
                <button
                  data-element-id="goal-option-maximize-v2"
                  className={`w-full p-4 text-left rounded-lg border transition-all ${
                    formData.goal === 'maximize'
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-background hover:bg-surface-light'
                  } ${isHighlighted('goal-option-maximize-v2') ? highlightClass : ''}`}
                  onClick={() => setFormData({ ...formData, goal: 'maximize' })}
                >
                  <div className="font-semibold">Get More Done</div>
                  <div className="text-sm text-foreground/60">
                    Complete more tasks and boost your daily output
                  </div>
                </button>
                <button
                  data-element-id="goal-option-optimize-v2"
                  className={`w-full p-4 text-left rounded-lg border transition-all ${
                    formData.goal === 'optimize'
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-background hover:bg-surface-light'
                  } ${isHighlighted('goal-option-optimize-v2') ? highlightClass : ''}`}
                  onClick={() => setFormData({ ...formData, goal: 'optimize' })}
                >
                  <div className="font-semibold">Work Smarter</div>
                  <div className="text-sm text-foreground/60">
                    Find better ways to organize and prioritize
                  </div>
                </button>
                <button
                  data-element-id="goal-option-balance-v2"
                  className={`w-full p-4 text-left rounded-lg border transition-all ${
                    formData.goal === 'balance'
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-background hover:bg-surface-light'
                  } ${isHighlighted('goal-option-balance-v2') ? highlightClass : ''}`}
                  onClick={() => setFormData({ ...formData, goal: 'balance' })}
                >
                  <div className="font-semibold">Balance Work & Life</div>
                  <div className="text-sm text-foreground/60">
                    Maintain healthy boundaries and avoid burnout
                  </div>
                </button>
              </div>
            </div>
            <button
              data-element-id="step0-continue-v2"
              disabled={!formData.goal}
              onClick={handleNext}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                formData.goal
                  ? 'bg-accent hover:bg-accent-light'
                  : 'bg-surface-light text-foreground/40 cursor-not-allowed'
              } ${isHighlighted('step0-continue-v2') ? highlightClass : ''}`}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 1: Focus Preferences (Simplified) */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Focus Preferences</h2>
              <p className="text-sm text-foreground/60 mb-4">
                How much do you want FocusFlow to guide you?
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground/90 block mb-2">
                    Guidance Level
                  </label>
                  <input
                    data-element-id="guidance-level-slider-v2"
                    type="range"
                    min="1"
                    max="5"
                    defaultValue="3"
                    className={`w-full mt-2 ${
                      isHighlighted('guidance-level-slider-v2') ? highlightClass : ''
                    }`}
                    onChange={(e) =>
                      setFormData({ ...formData, engagement: e.target.value })
                    }
                  />
                  <div className="flex justify-between text-xs text-foreground/60 mt-2">
                    <span>Less guidance</span>
                    <span>Moderate</span>
                    <span>More guidance</span>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-4 border border-border">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      data-element-id="auto-adjust-toggle-v2"
                      type="checkbox"
                      className={`mt-1 rounded ${
                        isHighlighted('auto-adjust-toggle-v2') ? highlightClass : ''
                      }`}
                    />
                    <div>
                      <span className="text-sm font-medium">Smart Adjustments</span>
                      <p className="text-xs text-foreground/60 mt-1">
                        Let FocusFlow learn from your habits and adjust settings automatically
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                data-element-id="step1-back-v2"
                onClick={handlePrev}
                className={`px-6 py-3 rounded-lg font-semibold border border-border hover:bg-surface-light transition-all ${
                  isHighlighted('step1-back-v2') ? highlightClass : ''
                }`}
              >
                Back
              </button>
              <button
                data-element-id="step1-continue-v2"
                onClick={handleNext}
                className={`flex-1 py-3 rounded-lg font-semibold bg-accent hover:bg-accent-light transition-all ${
                  isHighlighted('step1-continue-v2') ? highlightClass : ''
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Notifications (Clear CTA) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Stay Informed</h2>
              <p className="text-sm text-foreground/60 mb-4">
                Choose what updates you&apos;d like to receive (you can change this later)
              </p>
              <div className="space-y-3">
                {[
                  { id: 'updates', label: 'Important updates', desc: 'New features and fixes' },
                  { id: 'tips', label: 'Productivity tips', desc: 'Weekly suggestions to improve' },
                  { id: 'reports', label: 'Weekly progress', desc: 'Summary of your achievements' },
                ].map((option) => (
                  <label
                    key={option.id}
                    data-element-id={`notification-${option.id}-v2`}
                    className={`flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-light cursor-pointer ${
                      isHighlighted(`notification-${option.id}-v2`) ? highlightClass : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={formData.notifications.includes(option.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            notifications: [...formData.notifications, option.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            notifications: formData.notifications.filter(
                              (n) => n !== option.id
                            ),
                          });
                        }
                      }}
                    />
                    <div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-foreground/50">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                data-element-id="step2-back-v2"
                onClick={handlePrev}
                className={`px-6 py-3 rounded-lg font-semibold border border-border hover:bg-surface-light transition-all ${
                  isHighlighted('step2-back-v2') ? highlightClass : ''
                }`}
              >
                Back
              </button>
              <button
                data-element-id="step2-continue-v2"
                onClick={handleNext}
                className={`flex-1 py-3 rounded-lg font-semibold bg-accent hover:bg-accent-light transition-all ${
                  isHighlighted('step2-continue-v2') ? highlightClass : ''
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">You&apos;re All Set!</h2>
              <div className="space-y-3 bg-background rounded-lg p-4 border border-border">
                <div>
                  <div className="text-xs text-foreground/50">Your Goal</div>
                  <div className="font-medium">{formData.goal || 'Not selected'}</div>
                </div>
                <div>
                  <div className="text-xs text-foreground/50">Guidance Level</div>
                  <div className="font-medium">
                    {formData.engagement
                      ? `Level ${formData.engagement} of 5`
                      : 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-foreground/50">Notifications</div>
                  <div className="font-medium">
                    {formData.notifications.length} selected
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                data-element-id="step3-back-v2"
                onClick={handlePrev}
                className={`px-6 py-3 rounded-lg font-semibold border border-border hover:bg-surface-light transition-all ${
                  isHighlighted('step3-back-v2') ? highlightClass : ''
                }`}
              >
                Back
              </button>
              <button
                data-element-id="step3-finish-v2"
                onClick={handleNext}
                className={`flex-1 py-3 rounded-lg font-semibold bg-accent hover:bg-accent-light transition-all ${
                  isHighlighted('step3-finish-v2') ? highlightClass : ''
                }`}
              >
                Start Using FocusFlow
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to FocusFlow!</h2>
              <p className="text-foreground/60">
                Your personalized workspace is ready
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

