| schemaname | tablename | policyname                         | permissive | roles    | qual                                   | with_check        |
| ---------- | --------- | ---------------------------------- | ---------- | -------- | -------------------------------------- | ----------------- |
| public     | users     | Admins can read all users          | PERMISSIVE | {public} | ((id = auth.uid()) OR is_admin_user()) | null              |
| public     | users     | Superadmin can manage all users    | PERMISSIVE | {public} | is_superadmin_user()                   | null              |
| public     | users     | Users can insert their own profile | PERMISSIVE | {public} | null                                   | (id = auth.uid()) |
| public     | users     | Users can read their own profile   | PERMISSIVE | {public} | (id = auth.uid())                      | null              |
| public     | users     | Users can update their own profile | PERMISSIVE | {public} | (id = auth.uid())                      | null              |