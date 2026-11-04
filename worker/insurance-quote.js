// Cloudflare Worker adapter: operates ONLY with a documented, authorized insurer quote API.
// Configure secrets via Worker settings, not GitHub. It never processes IIN, 1414 or payment.
const insurers = new Set(["halyk", "nomad", "eurasia"]);
const carTypes = new Set(["Легковой автомобиль","Грузовой автомобиль","Автобус","Мотоцикл"]);
const regions = new Set(["Астана","Алматы","Шымкент","Акмолинская область","Алматинская область","Карагандинская область","Туркестанская область","Другой регион Казахстана"]);
const send = (payload, status, origin) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin"
  }
});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "").replace(/\/$/, "");
    if (!allowed || origin !== allowed) return new Response("Forbidden", { status: 403 });
    if (url.pathname !== "/api/insurance/quotes") return send({ error: "Not found" }, 404, origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "3600",
      "Vary": "Origin"
    }});
    if (request.method !== "POST") return send({ error: "Method not allowed" }, 405, origin);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return send({ error: "JSON required" }, 415, origin);
    if (Number(request.headers.get("Content-Length") || 0) > 2048) return send({ error: "Too large" }, 413, origin);
    let input;
    try { const body=await request.text(); if(body.length>2048) throw new Error("size"); input=JSON.parse(body); } catch (_) { return send({ error: "Invalid payload" }, 400, origin); }
    if (!input || !insurers.has(input.insurer) || input.product !== "ОГПО ВТС" || !regions.has(input.region) || !carTypes.has(input.vehicle) ||
      typeof input.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ||
      Object.keys(input).some(key=>!["insurer","product","region","vehicle","startDate"].includes(key))) {
      return send({ error: "Invalid parameters" }, 400, origin);
    }
    // No insurer contract/endpoint means an honest 503, never a fabricated premium.
    if (!env.INSURER_QUOTE_URL || !env.INSURER_API_TOKEN || env.INSURER_ID !== input.insurer) {
      return send({ error: "Provider not configured" }, 503, origin);
    }
    let target;
    try { target = new URL(env.INSURER_QUOTE_URL); } catch (_) { return send({ error: "Provider config invalid" }, 503, origin); }
    if (target.protocol !== "https:" || target.username || target.password) return send({ error: "Provider config invalid" }, 503, origin);
    const timeout = AbortSignal.timeout(12000);
    try {
      // Adapt the request/response field names ONLY according to the provider's official contract.
      const upstream = await fetch(target.href, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.INSURER_API_TOKEN },
        body: JSON.stringify(input),
        redirect: "error",
        signal: timeout,
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      if (!upstream.ok) return send({ error: "Upstream unavailable" }, 502, origin);
      const result = await upstream.json();
      const premium = Number(result.premiumKzt);
      if (!Number.isFinite(premium) || premium <= 0 || premium > 100000000) return send({ error: "Invalid insurer quote" }, 502, origin);
      return send({ insurer: input.insurer, premiumKzt: premium, currency: "KZT" }, 200, origin);
    } catch (_) {
      return send({ error: "Insurer request failed" }, 502, origin);
    }
  }
};