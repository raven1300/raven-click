import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('id');

  if (!jobId) {
    return new Response(JSON.stringify({ status: 'error' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const store = getStore('cooking-plans');
  const result = await store.get(jobId);

  if (!result) {
    return new Response(JSON.stringify({ status: 'pending' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(result, {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/recipes/cooking-plan-status' };
