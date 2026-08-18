/**
 * =========================================================================
 * Tahsin Tazwar — Global Tech Sales Talent Network
 * Google Apps Script backend for a static GitHub Pages front end.
 *
 * Flow
 *   Website form  ->  doPost()  ->  Google Sheet row
 *   Resume file   ->  doPost()  ->  Google Drive  ->  link stored in the row
 *   Every success ->  email notification to you
 *
 * -------------------------------------------------------------------------
 * CONFIGURATION  (Project Settings -> Script Properties)
 * Nothing below is hard coded, and nothing secret ever reaches the browser.
 *
 *   SPREADSHEET_ID        required   id of the talent network spreadsheet
 *   FOLDER_EXPERIENCED    required   Drive folder id for experienced resumes
 *   FOLDER_FRESHER        required   Drive folder id for fresher resumes
 *   NOTIFY_EMAIL          required   where the notification email is sent
 *   FORM_KEY              optional   shared string the front end must send
 *   TURNSTILE_SECRET      optional   reserved for Cloudflare Turnstile later
 *
 * Run setupOnce() once and it creates the spreadsheet, both tabs, the Drive
 * folders, and writes the first four properties for you.
 * =========================================================================
 */

/* ---------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------- */

var TAB_EXPERIENCED = 'Experienced Sales';
var TAB_FRESHER = 'Fresher Talent';
var ROOT_FOLDER_NAME = 'Tahsin Tazwar Talent Network Resumes';

var HEADERS_EXPERIENCED = [
  'Submitted At', 'Full Name', 'Email', 'WhatsApp', 'Years Of Experience',
  'Sales Currency', 'Total Foreign Sales', 'Domain Expertise', 'About',
  'Resume URL', 'Salary Currency', 'Expected Salary', 'Availability',
  'Additional Note', 'Status', 'Internal Note'
];

var HEADERS_FRESHER = [
  'Submitted At', 'Full Name', 'Email', 'WhatsApp', 'University', 'Background',
  'Graduation Year', 'LinkedIn', 'Why Global Tech Sales', 'Success Plan',
  '90 Day Plan', 'Domain Interests', 'Resume URL', 'Expected Salary',
  'Availability', 'Additional Note', 'Status', 'Internal Note'
];

var DEFAULT_STATUS = 'New';

var MAX_FILE_BYTES = 5 * 1024 * 1024;
var ALLOWED_EXT = ['pdf', 'doc', 'docx'];

/* A human cannot read and complete these forms faster than this. */
var MIN_FILL_MS = 4000;
/* One person, one submission per form, inside this window. */
var DUPLICATE_WINDOW_SEC = 120;
/* Whole endpoint ceiling, counted per minute. */
var MAX_PER_MINUTE = 30;

/* ---------------------------------------------------------------------
   Web app entry points
   --------------------------------------------------------------------- */

/**
 * Health check. Open the /exec URL in a browser after deploying and you should
 * see {"ok":true,...}. Nothing here reveals configuration.
 */
function doGet() {
  return json_({ ok: true, service: 'talent-network', ready: isConfigured_() });
}

/**
 * Single submission endpoint for both forms.
 * The body is JSON sent as text/plain, which keeps it a simple CORS request so
 * the browser never sends a preflight that Apps Script could not answer.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return fail_('empty_request');
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return fail_('bad_json');
    }

    /* ---- Spam gates, cheapest first ---- */

    // Honeypot: a field no human ever sees, so anything in it is a bot.
    if (payload.website) return json_({ ok: true, skipped: true });

    // Submitted faster than a person could type.
    if (Number(payload.elapsedMs || 0) < MIN_FILL_MS) return json_({ ok: true, skipped: true });

    // Optional shared key. Only a speed bump, it is visible in page source.
    var wantKey = prop_('FORM_KEY');
    if (wantKey && String(payload.key || '') !== wantKey) return fail_('bad_key');

    // Reserved hook. Set TURNSTILE_SECRET and post payload.turnstileToken to
    // switch Cloudflare Turnstile on without touching anything else here.
    if (!verifyTurnstile_(payload.turnstileToken)) return fail_('challenge_failed');

    var type = String(payload.type || '').toLowerCase();
    if (type !== 'experienced' && type !== 'fresher') return fail_('unknown_type');

    var data = payload.data || {};
    var errors = validate_(type, data, payload.resume);
    if (errors.length) return fail_('validation', errors);

    /* One writer at a time. Two submissions landing in the same second would
       otherwise race on appendRow and on the duplicate check below. */
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return fail_('busy');

    try {
      if (overRateLimit_()) return fail_('rate_limited');

      var email = String(data.email || '').trim().toLowerCase();
      var cache = CacheService.getScriptCache();
      var dupeKey = 'dupe_' + type + '_' + hash_(email);
      if (cache.get(dupeKey)) return fail_('duplicate');
      cache.put(dupeKey, '1', DUPLICATE_WINDOW_SEC);

      var result = (type === 'experienced')
        ? saveExperienced_(data, payload.resume)
        : saveFresher_(data, payload.resume);

      /* A mail failure must not lose a profile that is already in the sheet. */
      try {
        notify_(type, data, result);
      } catch (mailErr) {
        console.error('notification failed: ' + mailErr);
      }

      return json_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    /* Logged for you, never shown to the visitor. */
    console.error(err && err.stack ? err.stack : err);
    return fail_('server_error');
  }
}

/* ---------------------------------------------------------------------
   Validation
   --------------------------------------------------------------------- */

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function validate_(type, d, resume) {
  var errors = [];

  function need(key, label) {
    if (!String(d[key] === undefined || d[key] === null ? '' : d[key]).trim()) {
      errors.push(label + ' is required');
    }
  }
  function number(key, label, min, max) {
    var raw = String(d[key] === undefined ? '' : d[key]).trim();
    if (!raw) { errors.push(label + ' is required'); return; }
    var n = Number(raw);
    if (!isFinite(n)) { errors.push(label + ' must be a number'); return; }
    if (min !== null && n < min) errors.push(label + ' is out of range');
    if (max !== null && n > max) errors.push(label + ' is out of range');
  }

  need('fullName', 'Full name');
  need('whatsapp', 'WhatsApp number');
  if (!EMAIL_RE.test(String(d.email || '').trim())) errors.push('Email is not valid');

  var domains = toList_(d.domains);
  if (!domains.length) errors.push('Choose at least one domain');
  need('availability', 'Availability');
  if (String(d.availability || '') === 'Custom Date' && !String(d.availabilityDate || '').trim()) {
    errors.push('Custom date is required');
  }

  if (type === 'experienced') {
    number('years', 'Years of experience', 0, 60);
    need('salesCurrency', 'Sales currency');
    number('salesAmount', 'Total foreign sales', 0, null);
    need('about', 'About you');
    if (String(d.about || '').length > 400) errors.push('About you is too long');
    need('salaryCurrency', 'Salary currency');
    number('salaryAmount', 'Expected salary', 0, null);
    if (!resume) errors.push('Resume is required');
  } else {
    need('university', 'University');
    need('background', 'Background');
    number('gradYear', 'Graduation year', 1970, 2035);
    need('why', 'Why global tech sales');
    need('successPlan', 'Success plan');
    need('plan90', '90 day plan');
    if (String(d.why || '').length > 400) errors.push('Why global tech sales is too long');
    if (String(d.successPlan || '').length > 600) errors.push('Success plan is too long');
    if (String(d.plan90 || '').length > 500) errors.push('90 day plan is too long');
  }

  if (resume) {
    var name = String(resume.name || '');
    var dot = name.lastIndexOf('.');
    var ext = dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
    if (ALLOWED_EXT.indexOf(ext) < 0) errors.push('Resume must be PDF, DOC or DOCX');
    if (!resume.data) errors.push('Resume upload was empty');
    /* Trust the decoded length, not the size the browser reported. */
    var bytes = Math.floor(String(resume.data || '').length * 3 / 4);
    if (bytes > MAX_FILE_BYTES) errors.push('Resume is larger than 5 MB');
  }

  return errors;
}

/* ---------------------------------------------------------------------
   Saving
   --------------------------------------------------------------------- */

function saveExperienced_(d, resume) {
  var ss = openSpreadsheet_();
  var sheet = ensureTab_(ss, TAB_EXPERIENCED, HEADERS_EXPERIENCED);
  var name = clean_(d.fullName, 100);
  var resumeUrl = resume ? uploadResume_(resume, name, 'Experienced', prop_('FOLDER_EXPERIENCED')) : '';

  sheet.appendRow([
    new Date(),
    cell_(name),
    cell_(clean_(d.email, 120).toLowerCase()),
    cell_(clean_(d.whatsapp, 24)),
    numberOrBlank_(d.years),
    cell_(clean_(d.salesCurrency, 10)),
    numberOrBlank_(d.salesAmount),
    cell_(toList_(d.domains).join(', ')),
    cell_(clean_(d.about, 400)),
    resumeUrl,
    cell_(clean_(d.salaryCurrency, 10)),
    numberOrBlank_(d.salaryAmount),
    cell_(availability_(d)),
    cell_(clean_(d.note, 500)),
    DEFAULT_STATUS,
    ''
  ]);

  return { sheetUrl: tabUrl_(ss, sheet), resumeUrl: resumeUrl };
}

function saveFresher_(d, resume) {
  var ss = openSpreadsheet_();
  var sheet = ensureTab_(ss, TAB_FRESHER, HEADERS_FRESHER);
  var name = clean_(d.fullName, 100);
  var resumeUrl = resume ? uploadResume_(resume, name, 'Fresher', prop_('FOLDER_FRESHER')) : '';

  /* The fresher tab keeps salary in one column, so currency and amount are
     joined here rather than split the way the experienced tab does it. */
  var salary = String(d.salaryAmount || '').trim()
    ? clean_(d.salaryCurrency, 10) + ' ' + clean_(d.salaryAmount, 20)
    : '';

  sheet.appendRow([
    new Date(),
    cell_(name),
    cell_(clean_(d.email, 120).toLowerCase()),
    cell_(clean_(d.whatsapp, 24)),
    cell_(clean_(d.university, 120)),
    cell_(clean_(d.background, 120)),
    numberOrBlank_(d.gradYear),
    cell_(clean_(d.linkedin, 200)),
    cell_(clean_(d.why, 400)),
    cell_(clean_(d.successPlan, 600)),
    cell_(clean_(d.plan90, 500)),
    cell_(toList_(d.domains).join(', ')),
    resumeUrl,
    cell_(salary),
    cell_(availability_(d)),
    cell_(clean_(d.note, 500)),
    DEFAULT_STATUS,
    ''
  ]);

  return { sheetUrl: tabUrl_(ss, sheet), resumeUrl: resumeUrl };
}

/**
 * Writes the resume into the right folder under a predictable name:
 *   Full Name_Experienced_2026-08-18.pdf
 * Sharing is left untouched, so the file inherits the folder and stays private.
 */
function uploadResume_(resume, fullName, kind, folderId) {
  if (!folderId) throw new Error('Missing Drive folder id for ' + kind);

  var raw = String(resume.name || 'resume');
  var dot = raw.lastIndexOf('.');
  var ext = dot < 0 ? 'pdf' : raw.slice(dot + 1).toLowerCase();

  var safeName = String(fullName || 'Unnamed')
    .replace(/[\\\/:*?"<>|]/g, ' ')   // characters Drive and Windows dislike
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'Unnamed';

  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var filename = safeName + '_' + kind + '_' + stamp + '.' + ext;

  var blob = Utilities.newBlob(
    Utilities.base64Decode(resume.data),
    resume.mime || 'application/octet-stream',
    filename
  );

  var file = DriveApp.getFolderById(folderId).createFile(blob);
  return file.getUrl();
}

/* ---------------------------------------------------------------------
   Notification email
   --------------------------------------------------------------------- */

function notify_(type, d, result) {
  var to = prop_('NOTIFY_EMAIL');
  if (!to) return;

  var name = clean_(d.fullName, 100);
  var lines = [];
  var subject;

  if (type === 'experienced') {
    subject = 'New Global Tech Sales Profile: ' + name;
    lines.push('New experienced sales profile received.');
    lines.push('');
    lines.push('Name: ' + name);
    lines.push('Experience: ' + clean_(d.years, 10) + ' Years');
    lines.push('Foreign Sales: ' + clean_(d.salesCurrency, 10) + ' ' + clean_(d.salesAmount, 20));
    lines.push('Domain: ' + toList_(d.domains).join(', '));
    lines.push('Expected Salary: ' + clean_(d.salaryCurrency, 10) + ' ' + clean_(d.salaryAmount, 20));
    lines.push('Availability: ' + availability_(d));
  } else {
    subject = 'New Global Tech Sales Fresher Profile: ' + name;
    lines.push('New fresher profile received.');
    lines.push('');
    lines.push('Name: ' + name);
    lines.push('University: ' + clean_(d.university, 120));
    lines.push('Background: ' + clean_(d.background, 120));
    lines.push('Graduation Year: ' + clean_(d.gradYear, 10));
    lines.push('Domain: ' + toList_(d.domains).join(', '));
    lines.push('Availability: ' + availability_(d));
  }

  lines.push('Email: ' + clean_(d.email, 120));
  lines.push('WhatsApp: ' + clean_(d.whatsapp, 24));
  lines.push('');
  lines.push('Sheet: ' + result.sheetUrl);
  lines.push('Resume: ' + (result.resumeUrl || 'not provided'));

  var text = lines.join('\n');
  var html = lines.map(function (l) { return escapeHtml_(l) || '&nbsp;'; }).join('<br>')
    .replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

  MailApp.sendEmail({ to: to, subject: subject, body: text, htmlBody: html });
}

/* ---------------------------------------------------------------------
   Spam and rate control
   --------------------------------------------------------------------- */

/** Endpoint wide ceiling, per clock minute. */
function overRateLimit_() {
  var cache = CacheService.getScriptCache();
  var bucket = 'rate_' + Math.floor(Date.now() / 60000);
  var count = Number(cache.get(bucket) || 0) + 1;
  cache.put(bucket, String(count), 120);
  return count > MAX_PER_MINUTE;
}

/**
 * Cloudflare Turnstile hook, off until TURNSTILE_SECRET is set.
 * With the secret present, post the widget token as payload.turnstileToken and
 * this verifies it. No other code needs to change.
 */
function verifyTurnstile_(token) {
  var secret = prop_('TURNSTILE_SECRET');
  if (!secret) return true;
  if (!token) return false;
  try {
    var res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true
    });
    var body = JSON.parse(res.getContentText());
    return body.success === true;
  } catch (err) {
    console.error('turnstile check failed: ' + err);
    return false;
  }
}

/* ---------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------- */

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function isConfigured_() {
  return !!(prop_('SPREADSHEET_ID') && prop_('FOLDER_EXPERIENCED') && prop_('FOLDER_FRESHER') && prop_('NOTIFY_EMAIL'));
}

function openSpreadsheet_() {
  var id = prop_('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID is not set in Script Properties');
  return SpreadsheetApp.openById(id);
}

/** Creates the tab and its header row if either is missing, so the sheet heals itself. */
function ensureTab_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function tabUrl_(ss, sheet) {
  return ss.getUrl() + '#gid=' + sheet.getSheetId();
}

/**
 * Trim, normalise line endings, strip control characters, collapse runs of
 * spaces, cap the length. Newlines survive so the long answers keep the shape
 * the person typed.
 */
function clean_(value, max) {
  if (value === undefined || value === null) return '';
  var s = String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
  return max ? s.slice(0, max) : s;
}

/**
 * Sheets treats a leading =, +, - or @ as a formula, which turns a pasted
 * string into executable content. A leading apostrophe forces plain text and
 * is not displayed in the cell.
 */
function cell_(value) {
  var s = String(value === undefined || value === null ? '' : value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Numbers land as numbers so the columns stay sortable and filterable. */
function numberOrBlank_(value) {
  var raw = String(value === undefined ? '' : value).trim();
  if (!raw) return '';
  var n = Number(raw);
  return isFinite(n) ? n : cell_(clean_(raw, 30));
}

function availability_(d) {
  var choice = clean_(d.availability, 40);
  if (choice === 'Custom Date') {
    var date = clean_(d.availabilityDate, 20);
    return date ? 'Custom Date: ' + date : 'Custom Date';
  }
  return choice;
}

function toList_(value) {
  if (Array.isArray(value)) {
    return value.map(function (v) { return clean_(v, 60); }).filter(String).slice(0, 20);
  }
  var s = clean_(value, 400);
  return s ? [s] : [];
}

function hash_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text));
  return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('').slice(0, 24);
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail_(code, details) {
  var out = { ok: false, error: code };
  if (details) out.details = details;
  return json_(out);
}

/* ---------------------------------------------------------------------
   One time setup
   Run this once from the Apps Script editor. It builds the spreadsheet, both
   tabs, the Drive folders, and writes the ids into Script Properties. Then set
   NOTIFY_EMAIL and deploy.
   --------------------------------------------------------------------- */

function setupOnce() {
  var props = PropertiesService.getScriptProperties();

  var ssId = props.getProperty('SPREADSHEET_ID');
  var ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create('Tahsin Tazwar Talent Network');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    /* A brand new spreadsheet ships with an empty Sheet1 nobody wants. */
    var blank = ss.getSheetByName('Sheet1');
    ensureTab_(ss, TAB_EXPERIENCED, HEADERS_EXPERIENCED);
    if (blank) ss.deleteSheet(blank);
  }
  ensureTab_(ss, TAB_EXPERIENCED, HEADERS_EXPERIENCED);
  ensureTab_(ss, TAB_FRESHER, HEADERS_FRESHER);

  var root = folderByName_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  var experienced = folderByName_(root, 'Experienced');
  var fresher = folderByName_(root, 'Fresher');
  props.setProperty('FOLDER_EXPERIENCED', experienced.getId());
  props.setProperty('FOLDER_FRESHER', fresher.getId());

  if (!props.getProperty('NOTIFY_EMAIL')) {
    props.setProperty('NOTIFY_EMAIL', Session.getEffectiveUser().getEmail());
  }

  console.log([
    'Setup complete.',
    'SPREADSHEET_ID     ' + ss.getId(),
    'Spreadsheet URL    ' + ss.getUrl(),
    'FOLDER_EXPERIENCED ' + experienced.getId(),
    'FOLDER_FRESHER     ' + fresher.getId(),
    'NOTIFY_EMAIL       ' + props.getProperty('NOTIFY_EMAIL')
  ].join('\n'));
}

function folderByName_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/**
 * Optional smoke test. Run from the editor to push one fake experienced profile
 * through the whole path: validation, sheet row, notification email. Delete the
 * row afterwards.
 */
function testExperiencedSubmission() {
  var res = doPost({
    postData: {
      contents: JSON.stringify({
        type: 'experienced',
        key: prop_('FORM_KEY'),
        website: '',
        elapsedMs: 30000,
        data: {
          fullName: 'Test Profile',
          email: 'test@example.com',
          whatsapp: '+8801700000000',
          years: '7',
          salesCurrency: 'USD',
          salesAmount: '450000',
          domains: ['SaaS', 'Cloud'],
          about: 'Test submission from the Apps Script editor.',
          salaryCurrency: 'BDT',
          salaryAmount: '300000',
          availability: 'Within 30 Days',
          note: ''
        }
      })
    }
  });
  console.log(res.getContent());
}
