# Church Program Registration — Setup

## 1. Create a Supabase project
Go to supabase.com, create a new project, and wait for it to finish provisioning.

## 2. Run the schema
Open **SQL Editor** in your Supabase dashboard, paste the contents of `schema.sql`, and run it.
This creates the `profiles`, `registrants`, and `program_settings` tables with row-level
security. Admins can manage all registration and payment data; staff can register participants
and view the non-payment participant list. Each registrant is assigned a server-generated
`created_at` date and time when saved.

## 3. Create accounts and assign roles
Users can create their own account from `index.html` with a full name, phone number, email, and password.
The trigger creates a `user` profile automatically. To create the first administrator, go to
**Authentication -> Users -> Add user** and create the admin account (for example,
`admin@church.org`), then promote it in SQL Editor:
```sql
insert into public.profiles (id, role)
select id, 'admin'
from auth.users
where email = 'admin@church.org'
on conflict (id) do update set role = excluded.role;
```
Create other staff accounts from the user signup form and leave their role as `user`. The
admin login is available from the **Admin login** link on the user login page.

For email confirmation to return to the app, add your local or deployed app URL under
**Authentication -> URL Configuration -> Redirect URLs** in Supabase. For local testing,
run `npx serve .` and add the URL shown by that command, such as `http://localhost:3000/**`.

To confirm the rows and roles:
```sql
select u.email, p.id, p.role
from auth.users u
left join public.profiles p on p.id = u.id
order by u.email;
```
## 4. Connect the app
Open `config.js` and fill in:
- `SUPABASE_URL` — Project Settings -> API -> Project URL
- `SUPABASE_ANON_KEY` — Project Settings -> API -> anon public key

## 5. Swap in your background photo
In `style.css`, inside `.login-page`, replace the gradient line with:
```css
background: url('your-image.jpg') center / cover no-repeat;
```

## 6. Run it
Any static file server works, e.g. from this folder:
```
npx serve .
```
Then open `index.html`. This is the user login and signup page. Admins use its **Admin login**
link. Each account is redirected to the correct dashboard based on its role, and direct
dashboard URLs are role-protected.

## Files
- `index.html` / `auth.js` — shared role-aware login
- `user-login.html` — legacy URL that redirects to the shared login
- `dashboard.html` / `dashboard.js` — admin registration, payment, and printable list
- `user-dashboard.html` / `user-dashboard.js` — staff registration and non-payment list
- `style.css` — wine and white theme shared by both pages
- `config.js` — your Supabase credentials
- `schema.sql` — database tables and security policies
