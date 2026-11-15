import SkillsLayout from '../../../client/default/onboarding/skills.layout';
import { useOnboardingSkills } from '../../../hooks/useOnboardingSkills';

/** /profile/skills: the sign-up skills screen, saving back to Profile. */
const ProfileSkillsPage = () => <SkillsLayout {...useOnboardingSkills({ editing: true })} />;

export default ProfileSkillsPage;
