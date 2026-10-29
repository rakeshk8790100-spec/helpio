import JobsAdminLayout from '../../../../client/default/admin/jobsAdmin.layout';
import { useAdminJobs } from '../../../../hooks/admin/useAdminJobs';

/** /admin/jobs */
const JobsAdminPage = () => <JobsAdminLayout {...useAdminJobs()} />;

export default JobsAdminPage;
