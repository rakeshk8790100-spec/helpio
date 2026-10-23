import SkillsLayout from '../../../../client/default/onboarding/skills.layout';
import { useOnboardingSkills } from '../../../../hooks/useOnboardingSkills';

/** Provider sign-up step 2. Markup lives in client/default/onboarding. */
const SkillsPage = () => <SkillsLayout {...useOnboardingSkills()} />;

export default SkillsPage;
