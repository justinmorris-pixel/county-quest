Oklahoma County Quest
A game where students learn all 77 Oklahoma counties in 11 groups of 7, fill in a blank state map,
then name every county seat. Teachers see every student's progress on a dashboard.
Stack: React + Vite + Tailwind + Supabase + Vercel (all free tier).
---
SET UP (about 20 minutes, one time)
Part 1 — Supabase (the database)
Go to supabase.com and click New project. Name it `county-quest`. Save the database password. Pick a US region. Wait for it to finish creating.
In the left sidebar click SQL Editor, then New query.
On your computer open `supabase/schema.sql`, select all, copy. Paste it into the SQL Editor and click Run. You should see "Success. No rows returned".
In the left sidebar click Authentication, then Users, then Add user → Create new user. Enter your school email and a password. Check Auto Confirm User. Click Create user. (This is your teacher login.)
Still under Authentication, open Sign In / Providers and turn OFF "Allow new users to sign up" (wording may differ slightly). This keeps anyone else from making a teacher account.
Click the gear icon (Project Settings), then API Keys (or API). Copy two things into a note:
Project URL (looks like `https://abcdxyz.supabase.co`)
anon / public key (a long string starting with `eyJ` or `sb_publishable_`)
Already set up the earlier version? Update it (5 minutes)
Replace the files on GitHub with the new ones: open your repository, click Add file → Upload files, and drag in the contents of the new `county-quest` folder. GitHub replaces files with the same name. Click Commit changes. Vercel redeploys by itself.
In Supabase open SQL Editor → New query, paste the whole new `supabase/schema.sql`, and click Run. This adds PINs and the class leaderboard, and keeps every student's existing progress. (It is safe to run again even if you already ran an earlier version.)
Students who were already playing will be asked to create a PIN the next time they sign in on a new device or after tapping "Switch player". Devices that are already signed in keep going without a PIN.
Part 2 — GitHub (where the code lives)
On github.com click New repository. Name it `county-quest`. Click Create repository.
Unzip `county-quest.zip` on your computer.
On the empty repo page click uploading an existing file.
Open the unzipped `county-quest` folder. Select everything inside it (`index.html`, `package.json`, `vite.config.js`, `README.md`, the `src` folder, and the `supabase` folder) and drag it all onto the GitHub page. Wait for the uploads to finish.
Click Commit changes.
Part 3 — Vercel (the website)
Go to vercel.com, click Add New… → Project, and import your `county-quest` GitHub repo.
Framework Preset should say Vite. Leave the other settings alone.
Open Environment Variables and add these two:
Name `VITE_SUPABASE_URL`, value = your Project URL from Part 1
Name `VITE_SUPABASE_ANON_KEY`, value = your anon/public key from Part 1
Click Deploy. When it finishes, click the site link. That is your student game.
Part 4 — Your first class
Go to `https://YOUR-SITE.vercel.app/#/teacher` and sign in with the email and password from Part 1, step 4.
Click + New class, type a name (for example "Oklahoma History – 3rd Hour"), click Create.
You get a 6-character class code. Click Copy student link and give students that link (or the code and the site address).
Students type the code and their first name + last initial. The first time, they choose their own 4-number PIN. After that they enter their PIN to sign in. Their progress appears on your dashboard within seconds and refreshes every 30 seconds.
Make one class per class period so the data stays separate.
---
WHAT YOU CAN DO ON THE DASHBOARD
See each student's stage, counties mastered, best Full Map score, county seats mastered, accuracy, time played, and last active.
Click a student to see a colored map of what they know and every county they miss.
See the most-missed counties and county seats for the whole class.
Download a Summary CSV or a County Detail CSV (one column per county) for a gradebook.
Reset a forgotten PIN (their progress is kept; they choose a new PIN next time), reset a student's progress, or remove a student (for example if someone typed a name wrong).
THE ARCADE AND LEADERBOARD
The Daily Challenge is open to every student from day one. The Speed Round and Boss Round unlock when a student has mastered all 77 counties and all 77 county seats:
Challenge	How it works
⚡ Speed Round	60 seconds of quick multiple choice (counties, seats, borders). 10 points per right answer plus a combo bonus. Personal best is kept.
📅 Daily Challenge	10 questions, the same for the whole class each day (map taps, multiple choice, typing). One try per day. It covers all 77 counties, so early players will see counties they have not learned yet; every miss shows the right answer. Finishing on consecutive days builds a streak and bonus XP.
🌪️ Boss Round	All 77 counties, shuffled, getting harder as it goes. Three misses ends the run. Beating it earns a badge and a spot at the top of the Boss board.
The 🏆 Class Leaderboard is on every student's home screen (it needs a class code, so it is off in practice mode).
The first four boards only show classmates from the same class, and only names and scores: Overall (XP), Speed, Today's Daily, and Boss.
Students who have not unlocked the Speed Round or Boss Round yet appear only on the Overall and Daily boards.
The fifth board, 🏫 Class vs Class, compares all of your classes against each other (every class you created on your dashboard, so
name them something like "Period 3"). Students only see class names and totals, never students from other classes. You can switch it between:
Average XP per student
Progress (average share of counties and seats mastered)
Today's Daily (what share of the class finished today's Daily Challenge)
Everything is averaged per student, so a big class has no built-in advantage. It only shows more than one class if you have more than one class on your dashboard.
On your dashboard, open a student to see their arcade results.
Want to try the arcade yourself before finishing the game? Add `?arcade=1` to the end of the website address (for example `https://your-site.vercel.app/?arcade=1`).
Notes: scores are saved by each student's device, so a determined student could edit their own. That is fine for a class game, but
if you ever see a suspiciously perfect score, check their detail view. Daily questions are picked by the date, so they change at midnight
for everyone.
THINGS YOU MAY WANT TO CHANGE
What	Where
Which counties are in each stage, and the order	`src/data/stageGroups.js`
Stage names, colors, emoji	`src/lib/stages.js`
Pass mark for the Full Map Challenge (default 90%)	`MAP_PASS` in `src/lib/game.js`
Correct answers needed to master a county (3) or a seat (2)	`COUNTY_MASTER`, `SEAT_MASTER` in `src/lib/game.js`
Speed Round length, Daily Challenge length, Boss Round lives	`SPEED_SECONDS`, `DAILY_LEN`, `BOSS_LIVES` at the top of `src/lib/arcade.js`
To edit a file: open it on GitHub, click the pencil icon, change it, click Commit changes. Vercel redeploys automatically.
HOW STUDENTS SIGN IN (PINs)
Students do not make accounts. They enter the class code and their name, and the first time they choose a
4-number PIN. After that, the same name plus PIN brings their progress back on any device.
PINs are stored scrambled (hashed) in the database. You cannot see a student's PIN, and neither can anyone else.
Five wrong PINs in a row locks that student for 5 minutes, so nobody can guess their way in.
A device stays signed in until the student taps Switch player, so they are not asked for the PIN every visit.
On shared school computers, remind students to tap Switch player when they finish.
Forgot a PIN? Open the student on your dashboard and click Reset PIN. Their progress is kept and they
choose a new PIN the next time they sign in.
If two students in a class have the same name, one adds a number, like "Jordan M. 2", so they each get their own PIN.
TRYING IT WITHOUT A DATABASE
If the two environment variables are missing, the game runs in "practice mode" and saves progress only on that
device. The teacher dashboard needs the database.
RUNNING LOCALLY (optional)
    npm install
    cp .env.example .env     # then fill in the two values
    npm run dev
