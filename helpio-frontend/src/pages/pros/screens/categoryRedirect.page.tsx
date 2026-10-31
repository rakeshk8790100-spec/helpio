import { Navigate, useParams } from 'react-router-dom';
import { RouterKeys, withQuery } from '../../../config/router/RouterKeys';

/** /categories/:id opens Search filtered to that category. */
const CategoryRedirectPage = () => {
  const { id = '' } = useParams();
  return <Navigate to={withQuery(RouterKeys.SEARCH, { category: id })} replace />;
};

export default CategoryRedirectPage;
