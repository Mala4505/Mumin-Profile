import { describe, it, expect } from 'vitest'
import { filterRespondents } from '@/components/analytics/RespondentsTable'
import type { RespondentRow } from '@/app/api/analytics/form-respondents/route'

const rows: RespondentRow[] = [
  { its_no: '1001', name: 'Ahmed Ali', answer: 'Yes', sector_name: 'Sector A', subsector_name: 'Zone 1', submitted_at: '2026-04-12T10:00:00Z' },
  { its_no: '1002', name: 'Fatema Hussain', answer: 'No', sector_name: 'Sector B', subsector_name: 'Zone 2', submitted_at: '2026-04-11T10:00:00Z' },
  { its_no: '1003', name: 'Husain Rashid', answer: 'Yes', sector_name: 'Sector A', subsector_name: 'Zone 1', submitted_at: '2026-04-10T10:00:00Z' },
]

describe('filterRespondents', () => {
  it('returns all rows when no filters are active', () => {
    expect(filterRespondents(rows, null, null, '')).toHaveLength(3)
  })

  it('filters by answer', () => {
    const result = filterRespondents(rows, 'Yes', null, '')
    expect(result).toHaveLength(2)
    expect(result.every(r => r.answer === 'Yes')).toBe(true)
  })

  it('filters by sector', () => {
    const result = filterRespondents(rows, null, 'Sector B', '')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Fatema Hussain')
  })

  it('filters by name search (case-insensitive)', () => {
    const result = filterRespondents(rows, null, null, 'ahmed')
    expect(result).toHaveLength(1)
    expect(result[0].its_no).toBe('1001')
  })

  it('filters by ITS number search', () => {
    const result = filterRespondents(rows, null, null, '1002')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Fatema Hussain')
  })

  it('combines answer + sector filters', () => {
    const result = filterRespondents(rows, 'Yes', 'Sector A', '')
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no match', () => {
    expect(filterRespondents(rows, 'Maybe', null, '')).toHaveLength(0)
  })
})
