# Church Program Registration — Setup

## 1. Create a Supabase project
Go to supabase.com, create a new project, and wait for it to finish provisioning.

## 2. Run the schema
Open **SQL Editor** in your Supabase dashboard, paste the contents of `schema.sql`, and run it.
This creates the `registrants` and `program_settings` tables with row-level security so only
logged-in admins can read or write data. Each registrant is assigned a server-generated
`created_at` date and time when saved.

## 3. Create the admin account
Go to **Authentication -> Users -> Add user** and create the admin login
(e.g. `admin@church.org` with a password). This is the account you'll use to log in —
there is no public sign-up in this system by design.

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
Then open `index.html` (login) in your browser. After login you're taken to `dashboard.html`.

## Files
- `index.html` / `auth.js` — admin login
- `dashboard.html` / `dashboard.js` — registration form + timestamped table and printable list, guarded by session check
- `style.css` — wine and white theme shared by both pages
- `config.js` — your Supabase credentials
- `schema.sql` — database tables and security policies
