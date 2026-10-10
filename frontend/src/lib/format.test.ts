import { describe, it, expect } from 'vitest'
import { formatPercent, formatNumber, formatLocalDateTime, formatMatchSchedule } from './format'

describe('format utilities', () => {
  describe('formatPercent', () => {
    it('formata frações com 1 casa decimal e símbolo de %', () => {
      expect(formatPercent(0.584)).toBe('58,4%')
      expect(formatPercent(0.008)).toBe('0,8%')
      expect(formatPercent(1)).toBe('100,0%')
      expect(formatPercent(0)).toBe('0,0%')
    })

    it('trata valores nulos ou indefinidos como 0,0%', () => {
      expect(formatPercent(null)).toBe('0,0%')
      expect(formatPercent(undefined)).toBe('0,0%')
      expect(formatPercent(NaN)).toBe('0,0%')
    })
  })

  describe('formatNumber', () => {
    it('formata números decimais no padrão pt-BR', () => {
      expect(formatNumber(76.4, 1)).toBe('76,4')
      expect(formatNumber(1.6, 1)).toBe('1,6')
      expect(formatNumber(10000, 0)).toBe('10.000')
    })
  })

  describe('formatLocalDateTime', () => {
    it('converte data UTC para o fuso de São Paulo (UTC-3)', () => {
      // 2026-10-03T18:00:00Z -> 15:00 em SP
      const formatted = formatLocalDateTime('2026-10-03T18:00:00Z')
      expect(formatted).toContain('03/10/2026')
      expect(formatted).toContain('15:00')
    })

    it('retorna Data a definir quando nulo ou inválido', () => {
      expect(formatLocalDateTime(null)).toBe('Data a definir')
      expect(formatLocalDateTime('')).toBe('Data a definir')
      expect(formatLocalDateTime('data-invalida')).toBe('Data a definir')
    })
  })

  describe('formatMatchSchedule', () => {
    it('retorna Data a definir e Adiado quando isPostponed é verdadeiro', () => {
      const res = formatMatchSchedule('2026-06-01T20:00:00Z', true)
      expect(res.dateText).toBe('Data a definir')
      expect(res.timeText).toBe('Adiado')
      expect(res.isPostponed).toBe(true)
    })

    it('formata data e hora válidas para jogos agendados', () => {
      const res = formatMatchSchedule('2026-10-04T19:30:00Z', false)
      expect(res.isPostponed).toBe(false)
      expect(res.dateText).toContain('04/10')
      expect(res.timeText).toBe('16:30') // 19:30 UTC -> 16:30 SP
    })
  })
})
