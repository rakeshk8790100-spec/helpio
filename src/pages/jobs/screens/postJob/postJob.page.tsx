import PostJobLayout from '../../../../client/default/jobs/postJob.layout';
import { usePostJob } from '../../../../hooks/usePostJob';

/** /jobs/new: post a custom job or continue a draft (`?draft=<id>`). */
const PostJobPage = () => <PostJobLayout {...usePostJob()} />;

export default PostJobPage;
