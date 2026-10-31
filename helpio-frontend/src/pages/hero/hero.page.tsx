import HeroLayout from '../../client/default/hero/hero.layout';
import { useLanding } from '../../hooks/useLanding';

/** Public landing page for customers and providers alike. Markup lives in client/default/hero. */
const HeroPage = () => <HeroLayout {...useLanding()} />;

export default HeroPage;
