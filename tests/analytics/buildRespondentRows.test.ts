import { describe, it, expect } from 'vitest'
import { buildRespondentRows } from '@/app/api/analytics/form-respondents/route'

const makeMap = (entries: Array<[number, { name: string; sector_name: string; subsector_name: string }]>) =>
  new Map(entries)

describe('buildRespondentRows', () => {
  it('maps responses to RespondentRow shape', () => {
    const responses = [
      { answer: 'Yes', filled_for: 1001, submitted_at: '2026-04-12T10:00:00Z' },
    ]
    const members = makeMap([[1001, { name: 'Ahmed Ali', sector_name: 'Sector A', subsector_name: 'Zone 1' }]])
    const result = buildRespondentRows(responses, members)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      its_no: '1001',
      name: 'Ahmed Ali',
      answer: 'Yes',
      sector_name: 'Sector A',
      subsector_name: 'Zone 1',
      submitted_at: '2026-04-12T10:00:00Z',
    })
  })

  it('skips rows with null filled_for or null answer', () => {
    const responses = [
      { answer: null, filled_for: 1001, submitted_at: '2026-04-12T10:00:00Z' },
      { answer: 'Yes', filled_for: null, submitted_at: '2026-04-12T10:00:00Z' },
    ]
    const result = buildRespondentRows(responses, new Map())
    expect(result).toHaveLength(0)
  })

  it('falls back to Unknown name when member not in map', () => {
    const responses = [{ answer: 'No', filled_for: 9999, submitted_at: '2026-04-10T00:00:00Z' }]
    const result = buildRespondentRows(responses, new Map())
    expect(result[0].name).toBe('Unknown')
    expect(result[0].sector_name).toBe('N/A')
  })

  it('sorts by submitted_at descending', () => {
    const responses = [
      { answer: 'Yes', filled_for: 1, submitted_at: '2026-04-10T00:00:00Z' },
      { answer: 'No', filled_for: 2, submitted_at: '2026-04-12T00:00:00Z' },
    ]
    const members = makeMap([
      [1, { name: 'A', sector_name: '', subsector_name: '' }],
      [2, { name: 'B', sector_name: '', subsector_name: '' }],
    ])
    const result = buildRespondentRows(responses, members)
    expect(result[0].name).toBe('B')
    expect(result[1].name).toBe('A')
  })
})
