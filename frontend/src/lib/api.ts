import { dashboardResponseSchema, type DashboardResponse } from '../contracts/dashboard'

export class SnapshotUnavailableError extends Error {
  constructor(message = 'Snapshot indisponível no momento. O modelo ainda não foi calculado ou não há fotografia recente válida.') {
    super(message)
    this.name = 'SnapshotUnavailableError'
  }
}

export class DashboardApiError extends Error {
  public statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'DashboardApiError'
    this.statusCode = statusCode
  }
}

export async function fetchDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
  let response: Response

  try {
    response = await fetch('/api/dashboard', {
      headers: {
        Accept: 'application/json',
      },
      signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    throw new DashboardApiError(
      'Não foi possível conectar ao servidor backend. Verifique se a API está em execução.',
    )
  }

  if (response.status === 503) {
    throw new SnapshotUnavailableError()
  }

  if (!response.ok) {
    throw new DashboardApiError(
      `Falha na requisição: servidor respondeu com status ${response.status}.`,
      response.status,
    )
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new DashboardApiError('Resposta da API não é um JSON válido.')
  }

  const result = dashboardResponseSchema.safeParse(json)
  if (!result.success) {
    throw new DashboardApiError(
      `Dados recebidos da API não seguem o contrato esperado: ${result.error.issues.map((i) => i.message).join(', ')}`,
      200,
    )
  }

  return result.data
}
