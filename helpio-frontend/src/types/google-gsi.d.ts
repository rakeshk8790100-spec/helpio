/* Minimal typings for Google Identity Services (https://accounts.google.com/gsi/client). */

interface GoogleCredentialResponse {
  /** Google ID token (JWT); only the backend verifies it */
  credential: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
}

interface GoogleButtonConfiguration {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  /** Pixels, max 400 */
  width?: number;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
        disableAutoSelect: () => void;
      };
    };
  };
}
