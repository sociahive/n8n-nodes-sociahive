<p align="center">
  <a href="https://www.sociahive.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/sociahive/.github/main/assets/brand/logo-dark.svg">
      <img alt="SociaHive" src="https://raw.githubusercontent.com/sociahive/.github/main/assets/brand/logo-light.svg" width="220">
    </picture>
  </a>
</p>

<p align="center">Run your social media from your AI tool: schedule posts, build DM and comment automations, and read analytics.</p>
<p align="center">These are SociaHive nodes for n8n: post, automate and react to SociaHive events in your workflows.</p>

<p align="center">
  <a href="https://www.sociahive.com">Website</a> ·
  <a href="https://www.sociahive.com/developers">Developers</a> ·
  <a href="https://docs.sociahive.com/webhooks">Webhooks</a> ·
  <a href="https://www.sociahive.com/auth/login?view=sign_up">Sign up</a>
</p>

<p align="center">
  <a href="https://docs.n8n.io/integrations/community-nodes/"><img alt="n8n community node" src="https://img.shields.io/badge/n8n-community%20node-EA4B71"></a>
  <a href="LICENSE.md"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

# n8n-nodes-sociahive

[SociaHive](https://www.sociahive.com) nodes for [n8n](https://n8n.io): schedule and publish posts to Instagram, Facebook, LinkedIn, X, Threads, TikTok, YouTube, Bluesky, Pinterest and more, upload media, turn DM automations on and off, and start workflows from SociaHive events.

## What's in it

- **SociaHive** node: accounts, posts, media uploads, automations (flows) and analytics. See [Operations](#operations).
- **SociaHive Trigger** node: starts a workflow when a post is published or fails, when a client reviews a post, when a plug fires, or when an automation starts or errors. See [Trigger](#trigger).
- **SociaHive API** credential: your SociaHive API key.

## Platforms

### Publish to

<p align="center">
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/instagram.svg" alt="Instagram" title="Instagram" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/facebook.svg" alt="Facebook" title="Facebook" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/linkedin.svg" alt="LinkedIn" title="LinkedIn" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/x.svg" alt="X" title="X" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/threads.svg" alt="Threads" title="Threads" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/tiktok.svg" alt="TikTok" title="TikTok" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/youtube.svg" alt="YouTube" title="YouTube" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/bluesky.svg" alt="Bluesky" title="Bluesky" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/content-scheduler"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/pinterest.svg" alt="Pinterest" title="Pinterest" width="24"></a>
</p>

### Automate DMs and comments on

<p align="center">
  <a href="https://www.sociahive.com/automation/instagram"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/instagram.svg" alt="Instagram" title="Instagram" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/automation/facebook"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/facebook.svg" alt="Facebook" title="Facebook" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/features/messenger"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/messenger.svg" alt="Messenger" title="Messenger" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/automation/whatsapp"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/whatsapp.svg" alt="WhatsApp" title="WhatsApp" width="24"></a>&nbsp;&nbsp;
  <a href="https://www.sociahive.com/automation/telegram"><img src="https://raw.githubusercontent.com/sociahive/.github/main/assets/platforms/telegram.svg" alt="Telegram" title="Telegram" width="24"></a>
</p>

## Installation

In n8n, open **Settings > Community Nodes**, select **Install**, and enter:

```
n8n-nodes-sociahive
```

See n8n's [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for self-hosted and queue-mode setups.

## Credentials

1. In SociaHive, open **Settings > API keys** (`https://www.sociahive.com/settings?tab=api-keys`) and create a key. It starts with `sk_`. Give it the scopes you need: `accounts:read`, `posts:read`, `posts:write`, `uploads:write`, `flows:read`, `flows:write`, `analytics:read`, and `webhooks:read` + `webhooks:write` for the trigger.
2. In n8n, create a **SociaHive API** credential and paste the key. Leave **Base URL** as `https://www.sociahive.com/api/v1`.
3. Save. n8n checks the key by listing your connected accounts.

API access is part of the SociaHive trial and every paid plan. On the free plan the API answers `403 upgrade_required`.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| Account | Get Many | Lists your connected accounts (`id`, `platform`, `username`, `platform_user_id`, `status`). |
| Post | Create | Creates a post on one or more accounts: **Save as Draft**, **Publish Now** or **Schedule** (a time in the future). Optional images and videos by public URL. The post's timezone defaults to the workflow's timezone. |
| Post | Get | Gets one post with its per-platform status. |
| Post | Get Many | Lists posts, optionally by status. |
| Media | Upload From URL | Copies a JPEG, PNG, WebP, MP4 or MOV from a public URL into SociaHive and returns its `url`, `key`, `size_bytes` and `mime_type`. Use the `url` in Post > Create. |
| Flow | Get Many | Lists the automations of one connected account. |
| Flow | Get | Gets an automation with its steps. |
| Flow | Activate | Turns an automation on. SociaHive runs the same checks as the Turn on button and answers with the reason when it can't go live. |
| Flow | Deactivate | Turns an automation off (back to draft). |
| Flow | Get Stats | Runs, button clicks, unique people, status breakdown and a daily timeline. |
| Analytics | Get Overview | Post performance across your accounts, optionally for a date range or one platform. |

Each platform has its own text and media rules (for example X allows 280 characters, an Instagram carousel needs 2 to 10 items). When a post breaks one, SociaHive answers with the reason per account.

## Trigger

**SociaHive Trigger** subscribes a webhook in SociaHive when you activate the workflow and removes it when you deactivate it. Events:

| Event | Sent when |
|---|---|
| Post Published (`post.published`) | A scheduled post went live. |
| Post Failed (`post.failed`) | A scheduled post failed to publish. |
| Automation Started (`flow.triggered`) | An automation started for someone. |
| Automation Error (`flow.error`) | An automation hit an error. |
| Post Review Decision (`post.review_decision`) | A client approved a post, asked for changes or commented on a review link. Needs Studio or above. |
| Post Plug Fired (`post.plug_fired`) | A plug on a post reached its like, comment, repost or view threshold and reposted or commented. Needs Creator or above. |

Each delivery is a JSON body `{ id, event, timestamp, data }`. For the two newer events `data` is:

- `post.review_decision`: `{ postId, reviewLinkId, kind, reviewerName, comment? }`, where `kind` is `approved`, `changes_requested` or `comment`.
- `post.plug_fired`: `{ plug_id, post_id, account_id, platform, metric, threshold, value, action }`, where `metric` is `likes`, `comments`, `reposts` or `views` and `action` is `repost` or `comment`.

Activating a trigger with an event your plan does not include fails with "<event> is not included in your plan."

 The node checks the `X-SociaHive-Signature` header (`t=<unix seconds>,v1=<HMAC-SHA256 of "<t>.<body>">`) with the signing secret SociaHive returns when the webhook is created, and refuses a delivery that is unsigned, tampered with, or more than five minutes old.

Webhook deliveries need a plan with API access (the trial or a paid plan).

Each active SociaHive Trigger uses one webhook in your SociaHive account. Plans allow Creator 2, Studio 5, Pro 10 and Agency 50 webhooks, shared with the webhooks you add in SociaHive under **Integrations > Webhooks**.

## Example workflows

- **Publish from a spreadsheet.** Google Sheets Trigger (row added) > SociaHive: Media > Upload From URL > SociaHive: Post > Create (Schedule, `Scheduled At` from the row).
- **Alert on failures.** SociaHive Trigger (Post Failed, Automation Error) > Slack: Send Message.
- **Campaign switch.** Schedule Trigger > SociaHive: Flow > Activate on launch day, Deactivate a week later.

## Data and permissions

- The API key only reaches what its scopes allow. Revoke it any time in **Settings > API keys**.
- Accounts connect through each platform's official login and APIs. SociaHive does not scrape and never asks for your account password (Bluesky uses an app password, Telegram a bot token).
- Platform tokens are stored encrypted on SociaHive's servers and are never returned by the API.
- Trigger deliveries are signed. The node refuses a delivery that is unsigned, changed, or more than five minutes old.

## Compatibility

Built with `@n8n/node-cli` and tested with n8n 2.x.

## Resources

- [Changelog](CHANGELOG.md)
- [SociaHive developer docs](https://www.sociahive.com/developers)
- [SociaHive webhooks](https://docs.sociahive.com/webhooks)
- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
