#!/usr/bin/env node
/**
 * Lenny's Podcast Advisor MCP Server
 *
 * Provides product advice from Lenny's Podcast archive to Claude Code.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { AdviceSearch } from "./search.js";
import type { AdviceIndex } from "./types.js";
import { TOPICS } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the advice index
function loadAdviceIndex(): AdviceIndex {
  // Try multiple locations for the index file
  const possiblePaths = [
    path.join(__dirname, "..", "data", "advice-index.json"),
    path.join(__dirname, "..", "..", "data", "advice-index.json"),
    path.join(process.cwd(), "data", "advice-index.json"),
  ];

  for (const indexPath of possiblePaths) {
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      return JSON.parse(content) as AdviceIndex;
    }
  }

  throw new Error(
    `Advice index not found. Tried: ${possiblePaths.join(", ")}`
  );
}

async function main() {
  // Load index and create search instance
  let search: AdviceSearch;
  try {
    const index = loadAdviceIndex();
    search = new AdviceSearch(index);
    const stats = search.getStats();
    console.error(
      `[lenny-advisor] Loaded ${stats.totalChunks} advice chunks from index`
    );
  } catch (error) {
    console.error(`[lenny-advisor] Failed to load advice index: ${error}`);
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer(
    {
      name: "lenny-advisor",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register the get_product_advice tool
  server.registerTool(
    "get_product_advice",
    {
      title: "Get Product Advice from Lenny's Podcast",
      description: `Search Lenny's Podcast archive for product advice relevant to your plan.

Returns insights from interviews with product leaders at Stripe, Airbnb,
Figma, Notion, and 200+ other companies.

Available topics: ${TOPICS.join(", ")}

After receiving results, synthesize the advice against your specific plan.
Don't just list quotes - explain how each insight applies to the decisions
being made.`,
      inputSchema: z.object({
        topics: z
          .array(z.string())
          .describe(
            "Topics to search for (e.g., 'pricing', 'growth', 'hiring')"
          ),
        planSummary: z
          .string()
          .optional()
          .describe("Brief summary of what the plan is about for context"),
        maxResults: z
          .number()
          .default(5)
          .describe("Maximum number of advice chunks to return"),
      }),
    },
    async (args) => {
      const result = search.search({
        topics: args.topics,
        planSummary: args.planSummary,
        maxResults: args.maxResults,
      });

      // Format the response
      const formattedAdvice = result.advice.map((chunk, i) => {
        return `
## ${i + 1}. ${chunk.guest}
**Topics:** ${chunk.topics.join(", ")}
**Context:** ${chunk.context}

**Insight:** ${chunk.insight}

> "${chunk.quote}"

*Episode: ${chunk.episode}${chunk.timestamp ? ` (${chunk.timestamp})` : ""}*
`;
      });

      const content =
        result.advice.length > 0
          ? `Found ${result.totalMatches} relevant advice chunks (showing top ${result.advice.length}).

Topics matched: ${result.topicsMatched.join(", ")}

---
${formattedAdvice.join("\n---\n")}
---

**How to use this advice:**
Synthesize these insights against your specific plan. Consider:
- Which advice directly applies to decisions you're making?
- Are there conflicting perspectives? How do you reconcile them?
- What context from your situation changes how this advice applies?`
          : `No advice found for topics: ${args.topics.join(", ")}

Try different topics from: ${TOPICS.join(", ")}`;

      return {
        content: [
          {
            type: "text" as const,
            text: content,
          },
        ],
      };
    }
  );

  // Register a tool to list available topics
  server.registerTool(
    "list_lenny_topics",
    {
      title: "List Available Topics",
      description:
        "List all available topics you can search for in Lenny's Podcast archive.",
      inputSchema: z.object({}),
    },
    async () => {
      const stats = search.getStats();

      const topicList = TOPICS.map((topic) => {
        const count = stats.chunksByTopic[topic] || 0;
        return `- **${topic}**: ${count} advice chunks`;
      }).join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# Available Topics in Lenny's Podcast Archive

Total advice chunks: ${stats.totalChunks}

${topicList}

Use these topics with the \`get_product_advice\` tool to find relevant insights.`,
          },
        ],
      };
    }
  );

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[lenny-advisor] Server started, waiting for requests...");
}

main().catch((error) => {
  console.error("[lenny-advisor] Fatal error:", error);
  process.exit(1);
});
