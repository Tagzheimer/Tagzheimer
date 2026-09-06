import { Navigate } from 'react-router-dom';

/**
 * Backwards-compatible entry — settings now live in sub-pages
 * (see pages/settings/). Old links to /profile land on Account.
 */
export default function Profile() {
  return <Navigate to="/profile/account" replace />;
}
