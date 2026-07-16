update public.user_profiles up
set email = au.email
from auth.users au
where up.user_id = au.id
and up.email is null
and au.email is not null;