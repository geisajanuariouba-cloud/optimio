// Centraliza tradução de erros técnicos em mensagens amigáveis (PT-BR).
// Use sempre: toast.error(friendlyError(err))
export function friendlyError(e: unknown, fallback = "Algo deu errado. Tente novamente em instantes."): string {
  if (!e) return fallback;
  const raw = typeof e === "string" ? e : (e as any)?.message ?? (e as any)?.error_description ?? "";
  const msg = String(raw).toLowerCase();

  if (!msg) return fallback;

  // Rede
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed"))
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  if (msg.includes("timeout") || msg.includes("demorou demais"))
    return "A operação demorou mais que o esperado. Tente novamente — seus dados não foram perdidos.";
  if (msg.includes("aborted"))
    return "A operação foi cancelada antes de terminar.";

  // Auth / permissão
  if (msg.includes("jwt") || msg.includes("not authenticated") || msg.includes("invalid token"))
    return "Sua sessão expirou. Entre novamente para continuar.";
  if (msg.includes("permission denied") || msg.includes("row-level security") || msg.includes("rls"))
    return "Você não tem permissão para realizar essa ação.";
  if (msg.includes("not authorized") || msg.includes("não autorizado"))
    return "Acesso negado a este recurso.";

  // Validação / dados
  if (msg.includes("duplicate key") || msg.includes("already exists") || msg.includes("unique constraint"))
    return "Esse item já existe. Verifique se não foi cadastrado antes.";
  if (msg.includes("foreign key") || msg.includes("violates foreign key"))
    return "Não foi possível concluir porque esse item está vinculado a outros registros.";
  if (msg.includes("not null") || msg.includes("null value"))
    return "Preencha todos os campos obrigatórios antes de salvar.";
  if (msg.includes("invalid input syntax") || msg.includes("invalid uuid"))
    return "Há um campo com formato inválido. Revise os dados e tente de novo.";

  // IA / catálogo
  if (msg.includes("créditos") || msg.includes("limite de uso") || msg.includes("rate limit") || msg.includes("429"))
    return "Limite de uso da IA atingido. Aguarde alguns minutos e tente novamente.";
  if (msg.includes("too large") || msg.includes("payload too large") || msg.includes("413"))
    return "Arquivo grande demais. Envie um arquivo menor ou divida em partes.";

  // Storage
  if (msg.includes("storage") && msg.includes("not found"))
    return "Arquivo não encontrado no servidor. Tente reenviar.";

  // Já está em PT-BR amigável? devolve direto.
  if (/[áéíóúãõçà]/i.test(raw) || raw.length < 120) return raw;

  return fallback;
}
