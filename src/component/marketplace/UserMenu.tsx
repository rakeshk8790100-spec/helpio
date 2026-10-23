import { Dropdown } from 'antd';
import { LogOut } from 'lucide-react';
import type { AuthUser } from '../../common/CommonDto';
import { UserRole } from '../../common/CommonEnum';
import Avatar from '../ui/Avatar';

const ROLE_LABEL = { [UserRole.ADMIN]: 'Admin', [UserRole.CUSTOMER]: 'Customer', [UserRole.PROVIDER]: 'Professional' };

interface Props {
  user: AuthUser;
  onLogout: () => void;
}

/** Signed-in header control: avatar with account details and Log out. */
const UserMenu = ({ user, onLogout }: Props) => {
  const displayName = user.name ?? user.email;
  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      menu={{
        items: [
          {
            key: 'who',
            disabled: true,
            label: (
              <div className="py-1">
                <div className="text-sm font-semibold text-slate-900">{displayName}</div>
                <div className="text-xs text-slate-500">
                  {user.email} · {ROLE_LABEL[user.role]}
                </div>
              </div>
            ),
          },
          { type: 'divider' },
          { key: 'logout', icon: <LogOut size={14} />, label: 'Log out', danger: true, onClick: onLogout },
        ],
      }}
    >
      <button type="button" aria-label={`Account menu for ${displayName}`} className="rounded-full active:scale-95">
        <Avatar name={displayName} size="sm" />
      </button>
    </Dropdown>
  );
};

export default UserMenu;
