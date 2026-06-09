# Backwards-compat shim — canonical location is app.core.dependencies.
# All new code should import from app.core.dependencies directly.
from app.core.dependencies import (  # noqa: F401
    CurrentUser,
    DBDep,
    SettingsDep,
    SupabaseAdminDep,
    SupabaseDep,
    get_current_user,
    get_db,
    supabase_admin_dep,
    supabase_client_dep,
)
