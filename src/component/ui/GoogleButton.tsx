import { useEffect, useRef, useState } from 'react';
import { loadScript } from '../../lib/loadScript';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface Props {
  clientId: string;
  /** Receives Google's ID token (credential) */
  onCredential: (credential: string) => void;
}

/** Official "Continue with Google" button rendered by Google Identity Services. */
const GoogleButton = ({ clientId, onCredential }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Keep the latest callback without re-initialising Google on every render
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  useEffect(() => {
    let cancelled = false;
    loadScript(GSI_SRC)
      .then(() => {
        const el = containerRef.current;
        if (cancelled || !el || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => onCredentialRef.current(credential),
          cancel_on_tap_outside: true,
          context: 'signin',
        });
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(el.offsetWidth || 320, 400),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (failed) {
    return (
      <div role="status" className="rounded-full border border-slate-200 px-4 py-3 text-center text-xs text-slate-500">
        Google sign-in couldn't load. Use your email instead.
      </div>
    );
  }
  return <div ref={containerRef} className="flex min-h-11 w-full justify-center" />;
};

export default GoogleButton;
