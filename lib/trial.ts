// Trial helpers. Trial = 7 days from user.created_at.

export function getUserDaysIntoTrial(createdAt: number): number {
  const ms = Date.now() - createdAt;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function getTrialDaysRemaining(createdAt: number): number {
  return Math.max(0, 7 - getUserDaysIntoTrial(createdAt));
}
