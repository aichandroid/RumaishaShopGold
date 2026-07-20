export default function handler(req, res) {
  // Read Supabase credentials from Vercel Environment Variables
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ url, key });
}
