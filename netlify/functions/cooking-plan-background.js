import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __funcDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__funcDir, '../../.env') });

import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const { recipes, jobId } = await req.json();
  const store = getStore('cooking-plans');

  if (process.env.COOKING_PLAN_ENABLED !== 'true') {
    await store.set(jobId, JSON.stringify({ status: 'error' }), { ttl: 60 });
    return;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const recipeText = recipes.map(r => `### ${r.title}\n${r.method}`).join('\n\n');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `I want to cook these ${recipes.length} recipes in a single batch cooking session. Generate an optimised cooking plan that makes best use of passive cooking time (slow cooker, simmering, baking, etc.) to run multiple recipes in parallel where possible. Use relative timestamps (T+0:00, T+0:30, etc.). Be practical and specific — reference the actual steps from each recipe. Note any equipment conflicts (e.g. two recipes needing the same slow cooker at the same time) and suggest how to handle them. Do not use markdown tables — use plain text, headings, and bullet points only.\n\n${recipeText}`,
      }],
    });

    await store.set(jobId, JSON.stringify({ status: 'done', plan: message.content[0].text }), { ttl: 3600 });
  } catch (e) {
    await store.set(jobId, JSON.stringify({ status: 'error' }), { ttl: 3600 });
  }
};

export const config = { path: '/api/cooking-plan', background: true };
