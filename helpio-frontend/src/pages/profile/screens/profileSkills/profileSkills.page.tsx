import { SkillsLayout } from '@/clients';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useOnboardingSkills } from '@/hooks/useOnboardingSkills';

/** /profile/skills: the sign-up skills screen, saving back to Profile. */
const ProfileSkillsPage = () => (
  <SuspenseWrapper>
    <SkillsLayout {...useOnboardingSkills({ editing: true })} />
  </SuspenseWrapper>
);

export default ProfileSkillsPage;
