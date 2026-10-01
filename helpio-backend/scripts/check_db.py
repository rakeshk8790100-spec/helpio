"""Run with: python -m scripts.check_db."""
import sys
from sqlalchemy.exc import SQLAlchemyError
from app.core.database import check_database, close_database


def main() -> int:
    try:
        check_database()
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1
    except (SQLAlchemyError, RuntimeError):
        print("Database connection failed. Check host, user, password, SSL and network access.", file=sys.stderr)
        return 1
    finally:
        close_database()
    print("Supabase database connection verified (SELECT 1).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
