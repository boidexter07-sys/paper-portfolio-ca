'use client';

// Inline button rendered next to a user identity chip. On click it
// fires a CustomEvent on window: 'arena:open-challenge' with the
// recipient user id + display name. The actual ARENA challenge modal
// (lives elsewhere in the ARENA feature tree) listens for that event
// and opens itself with the recipient pre-filled.
//
// Why a CustomEvent and not a prop callback? Because the
// ChallengeButton is embedded inside deeply-nested Community
// components, but the ARENA modal lives in a different part of the
// React tree (likely at the AppShell level). Decoupling the two via
// a window event means Community doesn't import ARENA and vice versa.
//
// The button is only rendered if `recipientUserId !== currentUserId`.
// (Caller is responsible for that check; we double-belt it here.)

interface Props {
  recipientUserId: string;
  recipientDisplayName: string;
  currentUserId: string;
  className?: string;
}

export function ChallengeButton({ recipientUserId, recipientDisplayName, currentUserId, className }: Props) {
  if (recipientUserId === currentUserId) return null;
  function open() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('arena:open-challenge', {
        detail: { recipientId: recipientUserId, recipientName: recipientDisplayName },
      })
    );
  }
  return (
    <button
      type="button"
      onClick={open}
      className={className || 'pv-btn-ghost text-caption'}
      title={`Send an ARENA challenge to ${recipientDisplayName}`}
    >
      ⚔ Send Challenge
    </button>
  );
}
