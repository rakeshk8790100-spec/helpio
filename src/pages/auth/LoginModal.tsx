import LoginModalLayout from '../../client/default/auth/loginModal.layout';
import { useLoginModal } from '../../hooks/useLoginModal';

/** Header log-in popup. Mounted only while open, so its log-in hooks (and Google) load on demand. */
const LoginModal = ({ onClose }: { onClose: () => void }) => <LoginModalLayout {...useLoginModal(onClose)} />;

export default LoginModal;
