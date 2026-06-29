import { redirect } from 'next/navigation';

// Logout is now handled by /api/auth/logout which can modify cookies.
// Visiting /logout in a browser just redirects there.
export default function LogoutPage() {
  redirect('/api/auth/logout');
}
