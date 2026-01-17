# Lenny for Claude

[![npm version](https://img.shields.io/npm/v/lenny-for-claude.svg)](https://www.npmjs.com/package/lenny-for-claude)

Product advice from [Lenny's Podcast](https://www.lennyspodcast.com/) for Claude. Get insights from 298 episodes with product leaders at Stripe, Airbnb, Figma, Notion, and 200+ other companies.

## What is this?

An MCP server and Claude Code plugin that surfaces relevant product advice from Lenny's Podcast archive when you're planning features, making product decisions, or just need guidance on growth, pricing, hiring, and more.

**6,400+ advice chunks** extracted from 298 podcast episodes, searchable by topic.

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

## Usage

### Slash Commands (Claude Code)

```
/lenny-plan build a freemium pricing model for B2B SaaS
```

Enters plan mode with Lenny's advice pre-loaded and explicitly shown.

```
/lenny how should I approach my first PM hire
```

Get advice on any topic without entering plan mode.

### Direct Tool Use

Ask Claude to use the tools directly:

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

## Hooks (Claude Code)

When installed as a plugin, automatically provides Lenny's advice when you enter plan mode:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "EnterPlanMode",
      "hooks": [{
        "type": "prompt",
        "prompt": "Use get_product_advice to find relevant insights..."
      }]
    }]
  }
}
```

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
