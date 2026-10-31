import { Navigate, useSearchParams } from 'react-router-dom';
import RegisterLayout from '../../../../client/default/auth/register.layout';
import { RouterKeys, withQuery } from '../../../../config/router/RouterKeys';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';
import { homePath } from '../../authRedirect';
import { useRegister } from '../../../../hooks/useRegister';

const SignUp = () => <RegisterLayout {...useRegister()} />;

/** /pro/signup: provider sign-up step 1. Signed-in users continue where they belong (new providers: skills). */
const RegisterPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();

  if (!user) return <SignUp />;
  const target = homePath(user);
  // Carry the skill picked in the landing calculator into the skills step
  const skill = params.get('skill');
  return (
    <Navigate to={skill && target === RouterKeys.ONBOARDING_SKILLS ? withQuery(target, { category: skill }) : target} replace />
  );
};

export default RegisterPage;
