import { Navigate } from 'react-router-dom';
import AppSettingsLayout from '../../../../client/default/admin/appSettings.layout';
import { RouterKeys } from '../../../../config/router/RouterKeys';
import { useAppSettings } from '../../../../hooks/admin/useAppSettings';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';

const AppSettings = () => <AppSettingsLayout {...useAppSettings()} />;

/** /admin/settings: the owner only (the API refuses everyone else too). */
const AppSettingsPage = () => {
  const user = useAppSelector(selectCurrentUser);
  return user?.isOwner ? <AppSettings /> : <Navigate to={RouterKeys.ADMIN} replace />;
};

export default AppSettingsPage;
