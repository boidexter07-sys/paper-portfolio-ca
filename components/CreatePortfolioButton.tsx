'use client';

import { useState } from 'react';
import { PortfolioCreateModal } from './PortfolioCreateModal';

/**
 * T41: small client-side wrapper around PortfolioCreateModal so the
 * /portfolio Server Component can render the trigger button without
 * itself becoming a client component. Keeps the streaming / Suspense
 * boundary intact (the trigger renders above the Suspense fallback).
 */
export function CreatePortfolioButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="pv-btn-secondary" onClick={() => setOpen(true)}>
        + Create new portfolio
      </button>
      <PortfolioCreateModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}