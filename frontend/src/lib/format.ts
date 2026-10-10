/**
 * Utilitários de formatação para exibição no padrão pt-BR e fuso America/Sao_Paulo.
 */

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0,0%'
  }
  const pct = value * 100
  // Usar formatação pt-BR com 1 casa decimal
  return `${pct.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0,0'
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatLocalDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return 'Data a definir'
  }

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return 'Data a definir'
  }

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return 'Data a definir'
  }
}

export function formatMatchSchedule(
  isoDate: string | null | undefined,
  isPostponed = false,
): { dateText: string; timeText: string; isPostponed: boolean } {
  if (isPostponed || !isoDate) {
    return {
      dateText: 'Data a definir',
      timeText: 'Adiado',
      isPostponed: true,
    }
  }

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return {
      dateText: 'Data a definir',
      timeText: 'Horário a definir',
      isPostponed: false,
    }
  }

  try {
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })

    const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })

    return {
      dateText: dateFormatter.format(date),
      timeText: timeFormatter.format(date),
      isPostponed: false,
    }
  } catch {
    return {
      dateText: 'Data a definir',
      timeText: 'Horário a definir',
      isPostponed: false,
    }
  }
}
