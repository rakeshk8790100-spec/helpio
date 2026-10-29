import CatalogLayout from '../../../../client/default/admin/catalog.layout';
import { useAdminCatalog } from '../../../../hooks/admin/useAdminCatalog';

/** /admin/catalog */
const CatalogPage = () => <CatalogLayout {...useAdminCatalog()} />;

export default CatalogPage;
