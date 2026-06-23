// Supabase Edge Function: analyze-service
// Deploy: supabase functions deploy analyze-service
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { service } = await req.json();
    if (!service) return jsonError('Missing service', 400);

    const apiKey = Deno.env.get('OPENAI_API_KEY');

    // ── Deterministic fallback score (no API key needed) ──────────
    const fallback = computeFallbackScore(service);

    if (!apiKey) {
      return json({ ...fallback, source: 'local' });
    }

    // ── OpenAI structured analysis ────────────────────────────────
    const prompt = buildPrompt(service);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert marketplace coach helping teen workers (ages 13-19) create better service listings. Respond ONLY with valid JSON matching the schema provided.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error('OpenAI error', res.status, await res.text());
      return json({ ...fallback, source: 'local' });
    }

    const body = await res.json();
    const raw = body.choices?.[0]?.message?.content ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ ...fallback, source: 'local' });
    }

    // Merge AI score with fallback breakdown (AI gives holistic score)
    const aiScore = typeof parsed.score === 'number'
      ? Math.min(100, Math.max(0, Math.round(parsed.score)))
      : fallback.score;

    return json({
      score: aiScore,
      breakdown: fallback.breakdown, // always deterministic
      suggestions: (parsed.suggestions ?? []).slice(0, 6).map((s: any) => ({
        category: s.category ?? 'general',
        priority: s.priority ?? 'medium',
        issue: s.issue ?? '',
        suggestion: s.suggestion ?? '',
      })),
      strengths: (parsed.strengths ?? []).slice(0, 3),
      source: 'ai',
    });
  } catch (err) {
    console.error(err);
    return jsonError('Internal error', 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────

function buildPrompt(service: any): string {
  const pkg = (service.packages ?? [])
    .map((p: any) => `  ${p.name}: $${p.price}, ${p.delivery_days} days, features: ${p.features?.join(', ') || 'none'}`)
    .join('\n') || '  None defined';

  const faq = (service.faq ?? [])
    .map((f: any) => `  Q: ${f.question}`)
    .join('\n') || '  None';

  return `Analyze this teen worker's marketplace service listing and return JSON:

SERVICE:
  Title: ${service.title || '(empty)'}
  Category: ${service.category?.name || service.category_id || 'unknown'}
  Description: ${service.description || '(empty)'}
  Starting Price: $${service.starting_price}
  Delivery Days: ${service.delivery_days}
  Images: ${(service.images ?? []).length} uploaded
  Portfolio Examples: ${(service.portfolio_examples ?? []).length} linked
  Packages:
${pkg}
  FAQ Entries:
${faq}

Return this exact JSON schema:
{
  "score": <integer 0-100>,
  "strengths": [<up to 3 short strings about what's done well>],
  "suggestions": [
    {
      "category": <"title"|"description"|"pricing"|"images"|"portfolio"|"faq"|"packages">,
      "priority": <"high"|"medium"|"low">,
      "issue": <one sentence describing the problem>,
      "suggestion": <specific actionable fix, 1-2 sentences, address the worker as "you">
    }
  ]
}

Scoring guide (be honest, not overly generous):
- 0-40: Major gaps, unlikely to convert
- 41-65: Decent start, clear improvements needed
- 66-80: Good listing, a few tweaks away from great
- 81-100: Strong listing, ready to attract clients

Only include suggestions for genuine problems. Max 6 suggestions, ordered by priority (high first).`;
}

function computeFallbackScore(service: any): {
  score: number;
  breakdown: Record<string, number>;
  suggestions: any[];
  strengths: string[];
  source: string;
} {
  const breakdown: Record<string, number> = {
    title: 0,
    description: 0,
    images: 0,
    portfolio: 0,
    faq: 0,
    packages: 0,
    pricing: 0,
  };

  // Title (0-20)
  const titleLen = (service.title ?? '').trim().length;
  if (titleLen >= 30) breakdown.title = 20;
  else if (titleLen >= 15) breakdown.title = 14;
  else if (titleLen >= 5) breakdown.title = 7;

  // Description (0-25)
  const descLen = (service.description ?? '').trim().length;
  if (descLen >= 300) breakdown.description = 25;
  else if (descLen >= 150) breakdown.description = 18;
  else if (descLen >= 60) breakdown.description = 10;
  else if (descLen > 0) breakdown.description = 4;

  // Images (0-20)
  const imgCount = (service.images ?? []).length;
  breakdown.images = Math.min(20, imgCount * 7);

  // Portfolio (0-15)
  const portCount = (service.portfolio_examples ?? []).length;
  breakdown.portfolio = Math.min(15, portCount * 5);

  // FAQ (0-10)
  const faqCount = (service.faq ?? []).length;
  if (faqCount >= 3) breakdown.faq = 10;
  else if (faqCount >= 1) breakdown.faq = 6;

  // Packages (0-10)
  const pkgCount = (service.packages ?? []).length;
  if (pkgCount >= 3) breakdown.packages = 10;
  else if (pkgCount >= 1) breakdown.packages = 5;

  // Pricing signal (0-0, just for suggestions; excluded from score sum)
  // Reasonable price range: $5-$500
  const price = Number(service.starting_price);
  if (price >= 5 && price <= 500) breakdown.pricing = 0;

  const score = Math.min(
    100,
    Object.values(breakdown).reduce((a, b) => a + b, 0),
  );

  // Build local suggestions
  const suggestions: any[] = [];
  const strengths: string[] = [];

  if (breakdown.title < 14) {
    suggestions.push({
      category: 'title',
      priority: 'high',
      issue: 'Title is too short or generic.',
      suggestion: 'Make your title specific — include the platform, niche, or outcome (e.g. "Professional TikTok Reels Editing for Brands").',
    });
  } else {
    strengths.push('Clear, descriptive title');
  }

  if (breakdown.description < 18) {
    suggestions.push({
      category: 'description',
      priority: 'high',
      issue: 'Description lacks detail.',
      suggestion: 'Explain exactly what you deliver, what\'s included, your process, and why clients should choose you. Aim for 200+ words.',
    });
  } else {
    strengths.push('Detailed description');
  }

  if (breakdown.images === 0) {
    suggestions.push({
      category: 'images',
      priority: 'high',
      issue: 'No service images uploaded.',
      suggestion: 'Add at least one image showing examples of your work — listings with images get 3× more views.',
    });
  } else if (breakdown.images < 14) {
    suggestions.push({
      category: 'images',
      priority: 'medium',
      issue: 'Only one service image.',
      suggestion: 'Add 2-3 more images to showcase different examples or angles of your work.',
    });
  } else {
    strengths.push('Great image gallery');
  }

  if (breakdown.portfolio === 0) {
    suggestions.push({
      category: 'portfolio',
      priority: 'medium',
      issue: 'No portfolio examples linked.',
      suggestion: 'Link portfolio projects to this service so clients can see real examples of your past work.',
    });
  }

  if (breakdown.faq === 0) {
    suggestions.push({
      category: 'faq',
      priority: 'medium',
      issue: 'No FAQ section.',
      suggestion: 'Add 3-5 common questions clients ask (e.g. "What do you need from me?", "How many revisions?") to reduce friction.',
    });
  }

  if (breakdown.packages === 0) {
    suggestions.push({
      category: 'packages',
      priority: 'low',
      issue: 'No service tiers defined.',
      suggestion: 'Add Basic / Standard / Premium packages to let clients choose their budget and increase average order value.',
    });
  } else {
    strengths.push('Service packages offer client choice');
  }

  if (price < 10) {
    suggestions.push({
      category: 'pricing',
      priority: 'medium',
      issue: 'Price may be too low.',
      suggestion: 'Research similar services and consider pricing your work higher — undercharging can signal lower quality to clients.',
    });
  }

  return {
    score,
    breakdown,
    suggestions: suggestions.slice(0, 6),
    strengths,
    source: 'local',
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number) {
  return json({ error: message }, status);
}
