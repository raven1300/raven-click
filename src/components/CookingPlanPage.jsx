import { useState, useEffect } from 'preact/hooks';
import { marked } from 'marked';

export default function CookingPlanPage() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('id');
    if (!jobId) { setError(true); return; }

    const poll = async () => {
      try {
        const res = await fetch(`/api/cooking-plan-status?id=${jobId}`);
        const data = await res.json();
        if (data.status === 'done') {
          setPlan(data.plan);
        } else if (data.status === 'error') {
          setError(true);
        } else {
          setTimeout(poll, 4000);
        }
      } catch {
        setError(true);
      }
    };

    setTimeout(poll, 4000);
  }, []);

  if (error) return <p class="cooking-plan-loading">Failed to generate plan. Please try again.</p>;
  if (!plan) return <p class="cooking-plan-loading">Generating your cooking plan…</p>;
  return <div class="cooking-plan-text" dangerouslySetInnerHTML={{ __html: marked(plan) }} />;
}
