# Oklahoma County Quest

A game where students learn all 77 Oklahoma counties in 11 groups of 7, fill in a blank state map,
then name every county seat. Teachers see every student's progress on a dashboard.

Stack: React + Vite + Tailwind + Supabase + Vercel (all free tier).

---

## SET UP (about 20 minutes, one time)

### Part 1 — Supabase (the database)

1. Go to supabase.com and click **New project**. Name it `county-quest`. Save the database password. Pick a US region. Wait for it to finish creating.
2. In the left sidebar click **SQL Editor**, then **New query**.
3. On your computer open `supabase/schema.sql`, select all, copy. Paste it into the SQL Editor and click **Run**. You should see "Success. No rows returned".
4. In the left sidebar click **Authentication**, then **Users**, then **Add user** → **Create new user**. Enter your school email and a password. Check **Auto Confirm User**. Click **Create user**. (This is your teacher login.)
5. Still under **Authentication**, open **Sign In / Providers** and turn **OFF** "Allow new users to sign up" (wording may differ slightly). This keeps anyone else from making a teacher account.
6. Click the **gear icon (Project Settings)**, then **API Keys** (or **API**). Copy two things into a note:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon / public key** (a long string starting with `eyJ` or `sb_publishable_`)

### Part 2 — GitHub (where the code lives)

1. On github.com click **New repository**. Name it `county-quest`. Click **Create repository**.
2. Unzip `county-quest.zip` on your computer.
3. On the empty repo page click **uploading an existing file**.
4. Open the unzipped `county-quest` folder. Select **everything inside it** (`index.html`, `package.json`, `vite.config.js`, `README.md`, the `src` folder, and the `supabase` folder) and drag it all onto the GitHub page. Wait for the uploads to finish.
5. Click **Commit changes**.

### Part 3 — Vercel (the website)

1. Go to vercel.com, click **Add New… → Project**, and import your `county-quest` GitHub repo.
2. Framework Preset should say **Vite**. Leave the other settings alone.
3. Open **Environment Variables** and add these two:
   - Name `VITE_SUPABASE_URL`, value = your Project URL from Part 1
   - Name `VITE_SUPABASE_ANON_KEY`, value = your anon/public key from Part 1
4. Click **Deploy**. When it finishes, click the site link. That is your student game.

### Part 4 — Your first class

1. Go to `https://YOUR-SITE.vercel.app/#/teacher` and sign in with the email and password from Part 1, step 4.
2. Click **+ New class**, type a name (for example "Oklahoma History – 3rd Hour"), click **Create**.
3. You get a 6-character class code. Click **Copy student link** and give students that link (or the code and the site address).
4. Students type the code and their first name + last initial. Their progress appears on your dashboard within seconds and refreshes every 30 seconds.

Make one class per class period so the data stays separate.

---

## WHAT YOU CAN DO ON THE DASHBOARD

- See each student's stage, counties mastered, best Full Map score, county seats mastered, accuracy, time played, and last active.
- Click a student to see a colored map of what they know and every county they miss.
- See the most-missed counties and county seats for the whole class.
- Download a Summary CSV or a County Detail CSV (one column per county) for a gradebook.
- Reset a student's progress, or remove a student (for example if someone typed a name wrong).

## THINGS YOU MAY WANT TO CHANGE

| What | Where |
| --- | --- |
| Which counties are in each stage, and the order | `src/data/stageGroups.js` |
| Stage names, colors, emoji | `src/lib/stages.js` |
| Pass mark for the Full Map Challenge (default 90%) | `MAP_PASS` in `src/lib/game.js` |
| Correct answers needed to master a county (3) or a seat (2) | `COUNTY_MASTER`, `SEAT_MASTER` in `src/lib/game.js` |

To edit a file: open it on GitHub, click the pencil icon, change it, click **Commit changes**. Vercel redeploys automatically.

## HOW STUDENTS ARE IDENTIFIED

Students do not make accounts. They enter the class code and their name. Using the same name on any device
brings back their progress. Anyone who knows a classmate's exact name and the class code could open that
classmate's progress, so tell students to use only their own name.

## TRYING IT WITHOUT A DATABASE

If the two environment variables are missing, the game runs in "practice mode" and saves progress only on that
device. The teacher dashboard needs the database.

## RUNNING LOCALLY (optional)

    npm install
    cp .env.example .env     # then fill in the two values
    npm run dev
