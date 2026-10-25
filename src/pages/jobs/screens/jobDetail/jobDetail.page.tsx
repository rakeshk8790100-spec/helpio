import { useParams } from 'react-router-dom';
import JobDetailLayout from '../../../../client/default/jobs/jobDetail.layout';
import { useJobDetail } from '../../../../hooks/useJobDetail';

const JobDetail = ({ id }: { id: string }) => <JobDetailLayout {...useJobDetail(id)} />;

/** /jobs/:id: the customer's job hub. Keyed by id so moving between jobs starts fresh. */
const JobDetailPage = () => {
  const { id = '' } = useParams();
  return <JobDetail key={id} id={id} />;
};

export default JobDetailPage;
