# Red Canopies deploy on Render
1. Push this folder to a GitHub repo.
2. Render dashboard: New > Blueprint > pick the repo. It reads render.yaml.
3. After deploy, open Environment and copy ADMIN_KEY and SMS_KEY. Admin screen: /admin
4. Custom domain: Settings > Custom Domains > add redcanopies.co.ke and set the DNS records Render shows. Set SITE_URL to the live address.
5. Google: add the site in Search Console and submit /sitemap.xml.
6. Auto-verify Pochi: on the phone that receives Pochi, install an SMS forwarder app and POST each M-Pesa SMS as JSON {"text":"<sms>"} to https://YOUR-SITE/api/sms?key=SMS_KEY
