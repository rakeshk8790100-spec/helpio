from app.modules.auth.dependencies import require_role
from app.modules.auth.model import UserRole
from app.modules.customers.service import CustomerService

current_customer = require_role(UserRole.CUSTOMER)


def get_customer_service() -> CustomerService:
    return CustomerService()
