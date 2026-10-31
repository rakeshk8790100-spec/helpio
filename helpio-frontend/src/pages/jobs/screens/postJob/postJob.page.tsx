import PostJobLayout from '../../../../client/default/jobs/postJob.layout';
import { usePostJob } from '../../../../hooks/usePostJob';

/** /jobs/new: post a custom job, continue a draft or edit a posted one (`?job=<id>`). */
const PostJobPage = () => <PostJobLayout {...usePostJob()} />;

export default PostJobPage;
