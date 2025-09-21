const DONE_KEY = 'onboarding_done';
const STEP_KEY = 'onboarding_step';

export function isOnboardingDone(): boolean {
  return localStorage.getItem(DONE_KEY) === 'true';
}

export function markOnboardingDone(): void {
  localStorage.setItem(DONE_KEY, 'true');
  localStorage.removeItem(STEP_KEY);
}

export function getSavedStep(): number {
  const raw = localStorage.getItem(STEP_KEY);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

export function saveStep(step: number): void {
  localStorage.setItem(STEP_KEY, String(step));
}
