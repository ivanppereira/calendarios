import { buildWorkbook } from "../../../lib/buildWorkbook";
import { getUsuarioAutenticado } from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const usuario = await getUsuarioAutenticado(request);
  if (!usuario) {
    return new Response("É preciso entrar com o Google para continuar.", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const { ano, tipo, dias, atividades, campus } = body || {};
  if (!ano || !tipo || !dias) {
    return new Response("Campos obrigatórios ausentes (ano, tipo, dias)", { status: 400 });
  }

  try {
    const wb = await buildWorkbook({ ano, tipo, dias, atividades, campus });
    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Calendario_Academico_${ano}_${tipo}.xlsx"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(`Erro ao gerar planilha: ${e.message}`, { status: 500 });
  }
}
