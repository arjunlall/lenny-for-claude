/**
 * Compare extraction quality between Haiku 4.5 and Sonnet 4.5
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { TOPICS, type Topic } from "../src/types.js";

const TRANSCRIPTS_DIR = path.join(process.cwd(), "transcripts");

const MODELS = [
  { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", cost: "$1/$5" },
  { id: "claude-sonnet-4-5-20250929", name: "Sonnet 4.5", cost: "$3/$15" },
];

// Get a sample chunk from the first transcript
function getSampleChunk(): { chunk: string; guest: string } {
  const files = fs.readdirSync(TRANSCRIPTS_DIR).filter(f => f.endsWith(".txt"));
  const content = fs.readFileSync(path.join(TRANSCRIPTS_DIR, files[0]), "utf-8");
  const guest = path.basename(files[0], ".txt");

  // Get ~500 words from a meaty part of the transcript (skip intro)
  const lines = content.split("\n").slice(50, 150).join("\n");
  return { chunk: lines.slice(0, 2500), guest };
}

async function extractWithModel(
  client: Anthropic,
  model: string,
  chunk: string,
  guest: string
): Promise<{ result: string; inputTokens: number; outputTokens: number }> {
  const topicsList = TOPICS.join(", ");

  const prompt = `You are extracting product advice from a podcast transcript segment.

Guest: ${guest}

Transcript segment:
---
${chunk}
---

Analyze this segment and extract any actionable product advice.

Available topics: ${topicsList}

Respond in JSON format:
{
  "hasAdvice": true/false,
  "topics": ["topic1", "topic2"],
  "insight": "1-2 sentence summary of the advice",
  "quote": "The most impactful direct quote (keep it concise, under 200 chars)",
  "context": "What question or situation prompted this advice"
}

If no actionable advice, return: {"hasAdvice": false}`;

  const response = await client.messages.create({
    model,
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  return {
    result: text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Model Comparison: Haiku 4.5 vs Sonnet 4.5");
  console.log("=".repeat(60));

  const client = new Anthropic();
  const { chunk, guest } = getSampleChunk();

  console.log(`\nSample from: ${guest}`);
  console.log(`Chunk length: ${chunk.length} chars\n`);

  for (const model of MODELS) {
    console.log("-".repeat(60));
    console.log(`${model.name} (${model.cost})`);
    console.log("-".repeat(60));

    const start = Date.now();
    const { result, inputTokens, outputTokens } = await extractWithModel(
      client,
      model.id,
      chunk,
      guest
    );
    const elapsed = Date.now() - start;

    console.log(`Time: ${elapsed}ms`);
    console.log(`Tokens: ${inputTokens} in / ${outputTokens} out`);
    console.log(`\nExtraction:\n${result}\n`);
  }

  console.log("=".repeat(60));
  console.log("Compare the extractions above. Both should produce similar");
  console.log("quality for this structured extraction task.");
  console.log("=".repeat(60));
}

main().catch(console.error);
