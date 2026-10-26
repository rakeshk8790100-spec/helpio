import { useParams } from 'react-router-dom';
import JobChatLayout from '../../../../client/default/jobs/jobChat.layout';
import { RouterKeys, toPath } from '../../../../config/router/RouterKeys';
import { useJobChat } from '../../../../hooks/useJobChat';

const JobChat = ({ id, backTo }: { id: string; backTo: string }) => <JobChatLayout {...useJobChat(id, backTo)} />;

/** /jobs/:id/chat: the customer chats with the hired pro. */
export const CustomerJobChatPage = () => {
  const { id = '' } = useParams();
  return <JobChat key={id} id={id} backTo={toPath(RouterKeys.JOB_DETAIL, { id })} />;
};

/** /pro/jobs/:id/chat: the hired pro chats with the customer. */
export const ProviderJobChatPage = () => {
  const { id = '' } = useParams();
  return <JobChat key={id} id={id} backTo={toPath(RouterKeys.PRO_JOB_DETAIL, { id })} />;
};
