/* =========================================================
   Talent Network — front end configuration
   ---------------------------------------------------------
   THE ONLY FILE YOU EDIT ON THE WEBSITE SIDE.

   1. Deploy the Apps Script project (backend/talent-network.gs) as a Web App.
   2. Copy the deployment URL. It looks like:
        https://script.google.com/macros/s/AKfycb...../exec
   3. Paste it below, between the quotes, replacing PASTE_YOUR_WEB_APP_URL_HERE.

   Nothing secret belongs in this file. It ships to every visitor's browser.
   Spreadsheet IDs, folder IDs and the notification address all live in Apps
   Script Properties on the server side.
   ========================================================= */
window.TALENT_CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycbw07j57SF7OgvnGNvZQEhlSGPV6BHCi8Rsnvw2GJsomitHyFF6ksLbAxC2dYTa9WJQq/exec",

  /* Optional. If you also set a FORM_KEY script property in Apps Script, put
     the same string here so submissions are accepted. It is visible in page
     source, so treat it as a speed bump against drive by bots, not a secret.
     Leave it empty to switch the check off. */
  key: ""
};
