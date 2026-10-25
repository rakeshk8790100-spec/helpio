import NearbyJobsLayout from '../../../../client/default/jobs/nearbyJobs.layout';
import { useNearbyJobs } from '../../../../hooks/useNearbyJobs';

/** /pro/jobs: open jobs near the provider, as a list or a map. */
const NearbyJobsPage = () => <NearbyJobsLayout {...useNearbyJobs()} />;

export default NearbyJobsPage;
