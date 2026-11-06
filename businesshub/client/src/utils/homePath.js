// Where a logged-in person belongs. Customers have their own area; sellers go
// to their dashboard (or to business setup if they have not finished it).
// Everything that redirects after login or sign-up uses this, so the rule lives
// in one place.
export function homeFor(user) {
  if (!user) return '/login';
  if (user.role === 'buyer') return '/account';
  return user.onboardingComplete ? '/dashboard' : '/onboarding';
}
