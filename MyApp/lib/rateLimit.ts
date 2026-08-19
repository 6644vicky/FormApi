// In-memory, fixed-window rate limiter. Good enough to stop a single
// runaway script or bot from hammering an endpoint on a long-lived server,
// but each serverless instance keeps its own counters — on a platform that
// scales to multiple concurrent instances (e.g. Vercel), a distributed
// attacker can still get roughly (limit * instance count) requests through.
// Swap this for Upstash Redis (@upstash/ratelimit) if that gap matters for
// your deployment.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
