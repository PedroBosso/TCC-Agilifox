// ============================================================
//  faceService.ts
//  Adapte API_BASE_URL para o endereço do seu backend.
//
//  Endpoints esperados no backend:
//   POST /visitantes/cadastrar   → recebe { nome, apartamento, fotoBase64, dataRegistro }
//                                  retorna { sucesso: true, id: "uuid" }
//
//   POST /visitantes/reconhecer  → recebe { foto: "base64..." }
//                                  retorna { encontrado: true, visitante: {...}, confianca: 0.97 }
//
//   GET  /visitantes             → retorna Visitante[]
//
//   DELETE /visitantes/:id       → retorna { sucesso: true }
// ============================================================
 
export const API_BASE_URL = 'https://sua-api.com'; // ← altere aqui
 
export interface Visitante {
  id?: string;
  nome: string;
  apartamento: string;
  fotoBase64: string;
  dataRegistro?: string;
}
 
export interface ReconhecimentoResult {
  encontrado: boolean;
  visitante?: Visitante;
  confianca?: number; // 0 a 1
  mensagem?: string;
}
 
// ─── helpers ────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}
 
// ─── service ────────────────────────────────────────────────
export const faceService = {
  /** Cadastra novo visitante com foto */
  async cadastrarVisitante(
    visitante: Visitante,
  ): Promise<{ sucesso: boolean; id: string }> {
    const res = await fetch(`${API_BASE_URL}/visitantes/cadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...visitante,
        dataRegistro: visitante.dataRegistro ?? new Date().toISOString(),
      }),
    });
    return handleResponse(res);
  },
 
  /** Envia foto e recebe resultado do reconhecimento */
  async reconhecerRosto(fotoBase64: string): Promise<ReconhecimentoResult> {
    const res = await fetch(`${API_BASE_URL}/visitantes/reconhecer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foto: fotoBase64 }),
    });
    return handleResponse(res);
  },
 
  /** Lista todos os visitantes cadastrados */
  async listarVisitantes(): Promise<Visitante[]> {
    const res = await fetch(`${API_BASE_URL}/visitantes`);
    return handleResponse(res);
  },
 
  /** Remove um visitante pelo ID */
  async removerVisitante(id: string): Promise<{ sucesso: boolean }> {
    const res = await fetch(`${API_BASE_URL}/visitantes/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};
 