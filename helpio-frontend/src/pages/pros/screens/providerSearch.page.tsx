import ProviderSearchLayout from '../../../client/default/pros/providerSearch.layout';
import { useProviderSearch } from '../../../hooks/useProviderSearch';

/** /search: find pros who serve your area. */
const ProviderSearchPage = () => <ProviderSearchLayout {...useProviderSearch()} />;

export default ProviderSearchPage;
