/**
 * Topics that can be used to categorize and search advice
 */
export const TOPICS = [
  'growth',           // user acquisition, virality, growth loops
  'pricing',          // pricing strategy, monetization, packaging
  'product-market-fit', // PMF signals, validation, pivots
  'roadmap',          // prioritization, planning, saying no
  'metrics',          // KPIs, measurement, north star metrics
  'hiring',           // team building, interviews, culture
  'leadership',       // management, communication, influence
  'strategy',         // vision, positioning, competition
  'enterprise',       // B2B sales, enterprise features
  'consumer',         // B2C, marketplaces, social
  'ai',               // AI products, LLMs, AI strategy
  'execution',        // shipping, speed, iteration
  'culture',          // company culture, values, remote work
  'fundraising',      // raising money, investors, pitching
  'design',           // product design, UX, user research
  'analytics',        // data, experimentation, A/B testing
] as const;

export type Topic = typeof TOPICS[number];

/**
 * A single piece of advice extracted from a podcast transcript
 */
export interface AdviceChunk {
  /** Unique identifier for this chunk */
  id: string;

  /** Name of the podcast guest */
  guest: string;

  /** Episode title or identifier */
  episode: string;

  /** Topics this advice relates to */
  topics: Topic[];

  /** 1-2 sentence summary of the advice */
  insight: string;

  /** Direct quote from the transcript */
  quote: string;

  /** What question or situation prompted this advice */
  context: string;

  /** Timestamp in the episode, if available */
  timestamp?: string;
}

/**
 * The full advice index that ships with the package
 */
export interface AdviceIndex {
  /** Version of the index format */
  version: string;

  /** When the index was generated */
  generatedAt: string;

  /** Number of transcripts processed */
  transcriptCount: number;

  /** All advice chunks */
  chunks: AdviceChunk[];
}

/**
 * Input to the get_product_advice tool
 */
export interface GetProductAdviceInput {
  /** Topics to search for */
  topics: string[];

  /** Brief summary of the plan for context */
  planSummary?: string;

  /** Maximum number of results to return */
  maxResults?: number;
}

/**
 * Output from the get_product_advice tool
 */
export interface GetProductAdviceOutput {
  /** Matched advice chunks */
  advice: AdviceChunk[];

  /** Which topics were matched */
  topicsMatched: Topic[];

  /** Total number of matches before limiting */
  totalMatches: number;
}
