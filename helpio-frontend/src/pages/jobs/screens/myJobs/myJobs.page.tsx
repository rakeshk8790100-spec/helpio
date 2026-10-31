import MyJobsLayout from '../../../../client/default/jobs/myJobs.layout';
import { useMyJobs } from '../../../../hooks/useMyJobs';

/** /jobs: the customer's jobs by stage. */
const MyJobsPage = () => <MyJobsLayout {...useMyJobs()} />;

export default MyJobsPage;
