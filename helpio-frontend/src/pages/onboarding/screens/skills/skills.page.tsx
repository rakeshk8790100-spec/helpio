import { SkillsLayout } from '@/clients';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useOnboardingSkills } from '@/hooks/useOnboardingSkills';

/** Provider sign-up step 2: skills. */
const SkillsPage = () => (
  <SuspenseWrapper>
    <SkillsLayout {...useOnboardingSkills()} />
  </SuspenseWrapper>
);

export default SkillsPage;
