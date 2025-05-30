import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xszslyefernwixtgbroh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzenNseWVmZXJud2l4dGdicm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMjI5NjcsImV4cCI6MjA2Mzc5ODk2N30.6lqJmSpahpp52J7kkDAVdQByu-AAww-CkcF1p5tLd4o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function supabaseAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não enviado' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token inválido' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Usuário não autenticado' });

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro interno na autenticação' });
  }
}
