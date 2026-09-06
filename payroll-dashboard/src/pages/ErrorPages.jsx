// src/pages/ErrorPages.jsx
import { Button } from '../components/UI';
import { useNavigate } from 'react-router-dom';

export function Error401Page({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-soft border border-black/[0.04] space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
          🔒
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">401 - Session Expired</h1>
          <p className="text-sm text-gray-500">
            Your login session has expired or authentication failed. Please sign in again to continue.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Button
            variant="primary"
            onClick={() => {
              if (onLogout) onLogout();
              else {
                localStorage.clear();
                window.location.href = '/login';
              }
            }}
          >
            Return to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Error403Page({ session, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-soft border border-black/[0.04] space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
          🚫
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">403 - Access Forbidden</h1>
          <p className="text-sm text-gray-500">
            Your current role (<span className="font-semibold text-ink-900">{session?.role || 'User'}</span>) does not have permission to access this resource or perform this action.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (onLogout) onLogout();
              else {
                localStorage.clear();
                window.location.href = '/login';
              }
            }}
          >
            Sign in as Different User
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Error404Page() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-soft border border-black/[0.04] space-y-6">
        <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mx-auto text-2xl font-bold">
          🔍
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">404 - Page Not Found</h1>
          <p className="text-sm text-gray-500">
            The page or route you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Error500Page({ error, onRetry }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-soft border border-black/[0.04] space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">500 - Server Error</h1>
          <p className="text-sm text-gray-500">
            An unexpected error occurred while communicating with the server.
          </p>
          {error && (
            <p className="text-xs font-mono bg-red-50 text-red-700 p-2 rounded-xl border border-red-200 mt-2 text-left overflow-x-auto">
              {String(error)}
            </p>
          )}
        </div>
        <div className="flex gap-3 justify-center pt-2">
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try Again
            </Button>
          )}
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
