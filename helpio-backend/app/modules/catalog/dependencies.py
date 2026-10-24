from app.modules.catalog.service import CatalogService


def get_catalog_service() -> CatalogService:
    return CatalogService()
