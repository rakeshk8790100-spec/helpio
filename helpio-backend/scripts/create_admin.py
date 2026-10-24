"""Create an administrator account. Run with: python -m scripts.create_admin"""
import sys
from getpass import getpass

from pydantic import TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.core.database import close_database, get_engine
from app.core.exceptions import AppError
from app.modules.auth.schema import Email, PersonName
from app.modules.auth.service import AuthService


def main() -> int:
    try:
        email = TypeAdapter(Email).validate_python(input("Admin email: ").strip())
        name = TypeAdapter(PersonName).validate_python(input("Full name: "))
    except ValidationError as error:
        print(error.errors()[0]["msg"], file=sys.stderr)
        return 1
    password = getpass("Password (8+ characters): ")
    if len(password) < 8 or password != getpass("Repeat password: "):
        print("Passwords must match and be at least 8 characters.", file=sys.stderr)
        return 1

    try:
        with Session(get_engine()) as db:
            AuthService().create_admin(db, email=email, password=password, name=name)
    except AppError as error:
        print(error.detail, file=sys.stderr)
        return 1
    finally:
        close_database()
    print(f"Administrator {email} created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
