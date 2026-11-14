function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = rawUrl.trim();

  // If user pasted a PostgreSQL connection string instead of the Supabase API URL
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    // 1. Direct host match: db.<ref>.supabase.co or <ref>.supabase.co
    const supaMatch = url.match(/(?:@|:\/\/)(?:db\.)?([a-z0-9_-]+)\.supabase\.co/i);
    if (supaMatch && supaMatch[1]) {
      return `https://${supaMatch[1]}.supabase.co`;
    }

    // 2. Connection pooler username match: postgres.<ref>:...
    const poolerMatch = url.match(/postgres\.([a-z0-9_-]+):/i);
    if (poolerMatch && poolerMatch[1]) {
      return `https://${poolerMatch[1]}.supabase.co`;
    }

    // 3. Fallback URL parsing
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^db\./, "");
      if (host) return `https://${host}`;
    } catch (_) {}
  }

  // Ensure trailing slashes are removed
  return url.replace(/\/+$/, "");
}

export default function handler(req, res) {
  // Read Supabase credentials from Vercel Environment Variables
  const rawUrl = process.env.SUPABASE_URL || 
                 process.env.NEXT_PUBLIC_SUPABASE_URL || 
                 process.env.POSTGRES_URL || 
                 "";
  const url = normalizeSupabaseUrl(rawUrl);

  const key = process.env.SUPABASE_ANON_KEY || 
              process.env.SUPABASE_PUBLISHABLE_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
              "";
  
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ url, key });
}
