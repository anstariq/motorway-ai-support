# Motorway AI Support Demo Page

Single-page demo combining a Vapi voice agent and the chatQuartz chatbot,
styled to match motorway.software.

## Brand reference

Values below were read from the live site's computed styles rather than
approximated by eye, so the two line up when compared side by side.

| Element | Value |
| --- | --- |
| Accent green | `#61d836` |
| Headings | `#292b3c`, Helvetica Neue 38px/800, capitalize |
| Hero headline | Helvetica Neue 48px/500, uppercase, white |
| Hero subtitle | Source Sans 3 18px/500, white |
| Body | Source Sans 3 16px, `#374151` |
| Alternating bands | `#ebebeb` |
| Buttons | 16px/600, padding 14px 24px, radius 4px |

Typeface: **Source Sans 3** for body (as on the live site), Helvetica Neue for
display headings.

The short green rule under each section heading, and under selected words in
the hero headline, is the site's signature device — reproduced with `::after`
rather than images.

Assets: `motorway-logo.svg` is the live site's own inline SVG wordmark, so it
stays sharp at any size. `hero.jpg` is their hero photograph, resized to 1600px
and recompressed from 1.2 MB to 424 KB, and served locally rather than
hot-linked.

### Page sections

hero → belief band → Overview → Easy To Use → Benefits → Full Control →
Everyday Operations → Real-Time Reporting → Setup → footer. Roughly 4.5
viewports. All copy is the client's own, taken from the live page.

Links in the header and body are inert: this is a single-page demo, and the
call button is the only working control.

## Configuration

**Voice agent — done.** `ASSISTANT_ID` in `app.js` points at the Motorway
assistant, and `PUBLIC_KEY` is the account-level key for the same Vapi org, so
the two are a valid pair. Nothing further is required.

**Chatbot — outstanding, owned elsewhere.** The chatQuartz `<script>` at the
bottom of `index.html` is deliberately left commented out with a placeholder
account ID. Replace `YOUR_CHATQUARTZ_ACCOUNT_ID` and uncomment the tag to
enable it. The widget's colours and greeting come from that account's
dashboard, not from this repo.

## Access gate

`middleware.js` is Vercel Edge Middleware that runs before any file is served,
so `index.html`, `app.js` and the demo itself never reach an unauthenticated
visitor. A client-side check could not do this — the files would already be on
their machine by the time it ran.

The session is a stateless `<expiry>.<hmac(expiry)>` token in an
`HttpOnly; Secure; SameSite=Lax` cookie (`motorway_session`), valid for one
week. There is no session store. Changing `AUTH_SECRET` revokes every active
session. `/logout` clears the cookie.

`/login`, `/login.html`, `/style.css`, `/motorway-logo.svg` and `/hero.jpg` are
the only unauthenticated paths — exactly what the sign-in screen needs to
render.

### Credentials

There are deliberately **no hardcoded credential defaults**. A password or
signing secret committed to this repository would be readable by anyone with
access to it, revealing the password and allowing session cookies to be forged.
All three values come from the environment:

| Variable | Meaning |
| --- | --- |
| `AUTH_USER` | Sign-in username |
| `AUTH_PASSWORD` | Sign-in password |
| `AUTH_SECRET` | HMAC key for the session cookie; never sent to the browser |

If any is missing the gate fails closed with a 503 naming what to set, rather
than serving the demo unprotected. The signing secret is unique to this
project, so revoking access here never affects the other demos.

## Local development

```
npx serve .
```

Then open http://localhost:3000. Note the access gate is Vercel Edge
Middleware, so a plain static server will not run it and the page loads
without a sign-in prompt locally.

## Deploy

Vercel — static files, no build step. Pushes to `main` auto-deploy via the
GitHub integration.

```
vercel --prod
```
