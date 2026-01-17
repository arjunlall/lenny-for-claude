# Lenny for Claude

[![npm version](https://img.shields.io/npm/v/lenny-for-claude.svg)](https://www.npmjs.com/package/lenny-for-claude)

Product advice from [Lenny's Podcast](https://www.lennyspodcast.com/) for Claude. Get insights from 298 episodes with product leaders at Stripe, Airbnb, Figma, Notion, and 200+ other companies.

## What is this?

An MCP server that surfaces relevant product advice from Lenny's Podcast archive when you're planning features, making product decisions, or just need guidance on growth, pricing, hiring, and more.

**6,400+ advice chunks** extracted from 298 podcast episodes, searchable by topic.

## Example

You're building an AI feature and wondering whether to gate it behind a paywall:

```
> /lenny should I put my new AI feature behind a paywall or give it free to drive adoption?

## Lenny's Podcast Advice: AI Feature Monetization

### 1. Lead with value, monetize the workflow
**Guest:** Logan Kilpatrick — Google, OpenAI
> "Give away the AI capability that creates the 'aha moment' for free.
> Monetize the workflow and integrations built around it."

**Context:** How AI products should think differently about freemium
**Episode timestamp:** 00:34:12

---

### 2. Free creates data flywheel
**Guest:** Dharmesh Shah — HubSpot
> "Every free user is training your model and improving the product for
> paid users. That's a moat, not a cost center."

**Context:** Why HubSpot gives away AI features aggressively
**Episode timestamp:** 00:28:45

---

### 3. Gate on volume, not capability
**Guest:** Elena Verna — Amplitude, Miro
> "Don't hide your best features. Let everyone experience the magic,
> then charge based on usage or team size."

**Context:** Modern PLG approach to AI monetization
**Episode timestamp:** 00:19:22

---

## Key Takeaways

Based on insights from Logan Kilpatrick, Dharmesh Shah, and Elena Verna:

1. **Free AI = adoption flywheel** — The data from free users improves your AI.
2. **Gate on volume** — Let everyone try it, charge power users and teams.
3. **Monetize the workflow** — The AI feature hooks them, integrations retain them.
```

## Installation

### Claude Code (CLI)

```bash
claude mcp add lenny-for-claude -- npx -y lenny-for-claude
```

Or manually add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "lenny-for-claude": {
      "command": "npx",
      "args": ["-y", "lenny-for-claude"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lenny-for-claude": {
      "command": "npx",
      "args": ["-y", "lenny-for-claude"]
    }
  }
}
```

### Optional: Install Slash Command (Claude Code)

To get the `/lenny` slash command:

```bash
mkdir -p ~/.claude/commands
curl -o ~/.claude/commands/lenny.md https://raw.githubusercontent.com/arjunlall/lenny-for-claude/master/commands/lenny.md
```

### Optional: Install Plan Mode Hook (Claude Code)

To automatically get Lenny's advice when entering plan mode, add this to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "EnterPlanMode",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before writing the plan, use mcp__lenny-for-claude__get_product_advice to find relevant insights from Lenny's Podcast. Present the top 3-5 insights clearly labeled as 'Lenny's Podcast Insights' with the guest name and episode, then incorporate them into your planning."
          }
        ]
      }
    ]
  }
}
```

## Usage

### Slash Command

```
/lenny how should I approach my first PM hire
```

Get advice on any topic with nicely formatted output.

### Direct Tool Use

Ask Claude to use the tools directly:

- "Get me Lenny's advice on pricing strategies"
- "What does Lenny's podcast say about finding product-market fit?"

Available tools:
- `get_product_advice` - Search for advice by topic
- `list_lenny_topics` - See all available topics

## Available Topics

| Topic | Advice Chunks |
|-------|---------------|
| execution | 4,546 |
| strategy | 4,029 |
| leadership | 3,071 |
| product-market-fit | 1,960 |
| culture | 1,736 |
| growth | 1,202 |
| design | 873 |
| hiring | 864 |
| ai | 829 |
| metrics | 622 |
| analytics | 350 |
| roadmap | 225 |
| enterprise | 214 |
| pricing | 173 |
| consumer | 109 |
| fundraising | 108 |

## How It Works

1. **Pre-built index**: 298 podcast transcripts were processed to extract 6,400+ advice chunks, each tagged with relevant topics
2. **No API keys needed**: The advice index ships with the package - no external dependencies at runtime
3. **Topic-based search**: When you ask for advice, it finds chunks matching your topics and ranks by relevance
4. **Claude synthesizes**: Claude receives the raw advice chunks and synthesizes them against your specific context

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

### Re-ingesting transcripts

If you have access to the podcast transcripts:

```bash
# Place transcripts in ./transcripts/
npm run ingest
```

## License

MIT

## Credits

- [Lenny Rachitsky](https://www.lennysnewsletter.com/) for creating the podcast and [sharing the transcripts](https://x.com/lennysan/status/2011243567340298651) for the community to build with
- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
