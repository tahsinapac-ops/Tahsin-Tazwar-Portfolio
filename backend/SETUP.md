# Talent Network — Setup

Seven steps, roughly fifteen minutes. Do them in order.

---

## 1. Create the Google Sheet

Two options.

**Automatic (recommended).** Skip to step 3, paste the script, then run `setupOnce()`
from the Apps Script editor. It creates the spreadsheet, both tabs with the right
headers, and both Drive folders, and writes the IDs into Script Properties for you.
Then come back and check the result.

**Manual.** Create a spreadsheet named `Tahsin Tazwar Talent Network` with two tabs:

`Experienced Sales`

```
Submitted At | Full Name | Email | WhatsApp | Years Of Experience | Sales Currency |
Total Foreign Sales | Domain Expertise | About | Resume URL | Salary Currency |
Expected Salary | Availability | Additional Note | Status | Internal Note
```

`Fresher Talent`

```
Submitted At | Full Name | Email | WhatsApp | University | Background |
Graduation Year | LinkedIn | Why Global Tech Sales | Success Plan | 90 Day Plan |
Domain Interests | Resume URL | Expected Salary | Availability | Additional Note |
Status | Internal Note
```

The spreadsheet ID is the long string in its URL:
`https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

---

## 2. Create the Drive folders

In Google Drive, create:

```
Tahsin Tazwar Talent Network Resumes
├── Experienced
└── Fresher
```

Leave sharing alone. Files inherit the folder, so resumes stay private to you.

Each folder ID is the last part of its URL:
`https://drive.google.com/drive/folders/`**`THIS_PART`**

---

## 3. Add the IDs to Apps Script Properties

Go to [script.google.com](https://script.google.com) and create a new project named
`Talent Network`. Delete the sample code and paste in all of
`backend/talent-network.gs`.

Then open **Project Settings → Script Properties → Add script property** and add:

| Property | Value |
| --- | --- |
| `SPREADSHEET_ID` | the ID from step 1 |
| `FOLDER_EXPERIENCED` | the `Experienced` folder ID |
| `FOLDER_FRESHER` | the `Fresher` folder ID |
| `NOTIFY_EMAIL` | your email address |
| `FORM_KEY` | optional, see the note at the end |

If you used the automatic path, run `setupOnce()` now (Run → setupOnce, accept the
permission prompt) and the first four are filled in for you. Open the execution log
for the IDs and the new spreadsheet URL.

---

## 4. Deploy as a Web App

**Deploy → New deployment → Web app**

| Setting | Value |
| --- | --- |
| Execute as | **Me** |
| Who has access | **Anyone** |

`Anyone` is required. The website posts without a Google login, so anything stricter
rejects every visitor. The script still runs as you, so only you can see the sheet
and the resumes.

Accept the permission prompt. Copy the deployment URL, which ends in `/exec`.

Paste that URL into a browser tab. You should see:

```json
{"ok":true,"service":"talent-network","ready":true}
```

`ready:false` means a property from step 3 is missing.

> Every time you edit the script you must **Deploy → Manage deployments → Edit →
> Version: New version → Deploy**, or the live site keeps running the old code.

---

## 5. Add the Web App URL to the website

Open `assets/talent-config.js` and paste the URL between the quotes:

```js
window.TALENT_CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycb....../exec",
  key: ""
};
```

That is the only website file you edit. Commit and push, and GitHub Pages redeploys
on its own.

---

## 6. Set the notification email

It is the `NOTIFY_EMAIL` script property from step 3. Change it any time in
**Project Settings → Script Properties**. No redeploy needed for a property change.

Emails arrive as:

```
Subject: New Global Tech Sales Profile: [Name]
Subject: New Global Tech Sales Fresher Profile: [Name]
```

with the sheet link and the resume link in the body.

---

## 7. Test one of each

Open `https://tahsintazwar.com/talent-network/`

1. Click **Experienced Professional**, fill every field, attach a small PDF, submit.
   Take longer than four seconds over it, since faster than that is treated as a bot.
2. Confirm: a new row in `Experienced Sales` with Status `New`, a file named
   `Your Name_Experienced_2026-08-18.pdf` in Drive → Experienced, and an email.
3. Open `https://tahsintazwar.com/talent-network/fresher/` and repeat.
   Confirm the row in `Fresher Talent` and the second email.
4. Delete both test rows and both test files.

The same email cannot submit the same form twice within two minutes. That is the
duplicate guard, not a fault. Wait it out when testing.

If a submission fails, the visitor sees only *Something went wrong. Please try
again.* The real reason is in **Apps Script → Executions**.

---

## Optional: FORM_KEY

Set a `FORM_KEY` script property and put the same string in `assets/talent-config.js`.
Submissions without it are rejected. It is visible in page source, so it stops
drive by bots, not a determined person. Leave both empty to switch it off.

Cloudflare Turnstile can be added later without restructuring anything: set a
`TURNSTILE_SECRET` property, add the widget to both forms, and post its token as
`turnstileToken`. The verification code is already in the script.
