# Add PCS Tracker to PCS Planning

1. Confirm the GitHub revision has deployed on the existing host. The repository currently references `https://thewing.netlify.app`; verify `/PCS-Tracker/` and `/PCS-Tracker/embed.js` on that host before using the snippet. If the host differs, change the script origin accordingly.
2. In Webflow, add a Code Embed where the planner should appear in the Orders & Timeline section. Keep the existing education and other sections until the replacement layout is reviewed.
3. Paste the contents of `embed.html`. Do not paste the application files into the Webflow Embed. The script loads the hosted app and adjusts its iframe height.
4. Preview at desktop and phone sizes. Check task editing, tabs, downloads, and links back to Allowances & Costs. Custom embed scripts may require a published preview to run; Designer rendering alone does not establish runtime behavior.
5. Publish to the Webflow staging subdomain only when separately authorized. Custom-domain publication requires its own authorization.

The standalone page includes a compact PCS header; `?embed=1` hides it to avoid a second header inside the existing page. The embedded app also hides its trailing allowances promotion because the parent page already contains that section.

The loader derives the app URL from its own script URL, sends the parent's exact origin, and accepts resize messages only from that iframe and hosting origin. It does not exchange planner data. Do not strip these checks or use a wildcard message target.

Browser-local storage in a third-party iframe may be unavailable or partitioned. Export/import is the supported portable backup. The app is not an official document-storage service and does not synchronize with the existing cost worksheet or PCS calculator.

For local embedding QA, serve the repository and open `/PCS-Tracker/webflow/qa.html`. This harness is a test page, not the production embed snippet.
