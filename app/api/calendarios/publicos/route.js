import { getSupabaseServer, TABELA_CALENDARIOS } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(TABELA_CALENDARIOS)
      .select("id, nome, ano, tipo, campus, dono_email, publicado, updated_at")
      .eq("publicado", true)
      .order("campus", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return Response.json({ calendarios: data || [] });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
