# Changelog

## 0.2.0

First release from this repository (it replaces the unpublished 0.1.0 that lived in the SociaHive monorepo).

- Credentials: API key sent as `X-API-Key`; base URL defaults to `https://www.sociahive.com/api/v1`; the credential test reads your connected accounts.
- Account: Get Many.
- Post: Create (save as draft, publish now or schedule, with images and videos), Get, Get Many.
- Media: Upload From URL.
- Flow: Get Many, Get, Activate, Deactivate, Get Stats.
- Analytics: Get Overview.
- Trigger: Post Published, Post Failed, Automation Started, Automation Error and Lead Collected. Every delivery's `X-SociaHive-Signature` is checked against the subscription's signing secret.
- Built with `@n8n/node-cli`, published from GitHub Actions with npm provenance.
