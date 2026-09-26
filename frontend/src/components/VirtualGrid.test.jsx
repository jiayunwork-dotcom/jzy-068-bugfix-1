import { describe, it, expect, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import VirtualGrid from '../components/VirtualGrid'

// Regression test for the production white screen: VirtualGrid used to declare
// a useRef after an early `if (!sheet) return null`. On first load `sheet` is
// null (workbook snapshot still in flight), so that render ran one hook fewer
// than the render that laid out the grid once the snapshot arrived. React
// then threw "Rendered more hooks than during the previous render" and
// unmounted the whole app — most reliably on a fresh production load.
//
// This test drives the exact sequence: mount with no data (the state right
// after page open), then re-render with the freshly fetched workbook, and
// asserts the grid and its computed cell values actually appear.

// Shape mirrors the server SnapshotMsg workbook.sheets payload.
const loadedSheet = {
  name: '预算表',
  rows: 1000,
  cols: 26,
  cells: {
    A1: { sheet: '预算表', cell: 'A1', raw: '项目', value: '项目', kind: 'string' },
    B1: { sheet: '预算表', cell: 'B1', raw: '金额', value: '金额', kind: 'string' },
    A2: { sheet: '预算表', cell: 'A2', raw: '场地', value: '场地', kind: 'string' },
    B2: { sheet: '预算表', cell: 'B2', raw: '100', value: '100', kind: 'number' },
    A3: { sheet: '预算表', cell: 'A3', raw: '人力', value: '人力', kind: 'string' },
    B3: { sheet: '预算表', cell: 'B3', raw: '230', value: '230', kind: 'number' },
    B4: {
      sheet: '预算表',
      cell: 'B4',
      raw: '=SUM(B2:B3)',
      value: '330', // computed server side, e.g. the budget total rollup
      kind: 'number',
    },
  },
}

function cellAt(sheetName, col, row) {
  const addr = String.fromCharCode(65 + col) + (row + 1)
  return loadedSheet.cells[addr] || null
}

function makeProps(sheet) {
  return {
    sheet,
    me: 'me-1',
    presence: { me: 'me-1', peers: [] },
    selection: { sheet: '预算表', col: 0, row: 0 },
    onSelect: vi.fn(),
    cellAt: vi.fn(cellAt),
    onCommitCell: vi.fn(),
    endEdit: vi.fn(),
    commitAndMove: vi.fn(),
    editing: null,
    beginEdit: vi.fn(),
    updateEditText: vi.fn(),
    clearPicked: vi.fn(),
    cancelEdit: vi.fn(),
  }
}

describe('VirtualGrid data loading', () => {
  it('renders the grid when workbook data arrives after an empty first render', () => {
    // First render: page just opened, snapshot has not arrived yet.
    const props = makeProps(null)
    const result = render(<VirtualGrid {...props} />)

    // The grid area is empty but the app is alive and no error was thrown.
    expect(document.querySelector('.grid')).toBeNull()

    // Snapshot arrives: useCollabSheet sets activeSheetData and re-renders the
    // same component instance. Before the fix this threw the hooks-mismatch
    // error and unmounted the entire React tree.
    result.rerender(<VirtualGrid {...makeProps(loadedSheet)} />)

    const grid = document.querySelector('.grid')
    expect(grid).not.toBeNull()

    // Column / row headers of the visible window are laid out.
    expect(within(grid).getByText('A')).toBeTruthy()
    expect(within(grid).getByText('1')).toBeTruthy()

    // Literal and formula-computed values are both on display.
    expect(within(grid).getByText('330')).toBeTruthy() // =SUM(B2:B3) result
    expect(within(grid).getByText('场地')).toBeTruthy()
  })

  it('keeps rendering through subsequent data patches once loaded', () => {
    const result = render(<VirtualGrid {...makeProps(null)} />)
    result.rerender(<VirtualGrid {...makeProps(loadedSheet)} />)
    // A collaborator edit arrives as a patch (cells re-render in place).
    result.rerender(<VirtualGrid {...makeProps(loadedSheet)} />)
    expect(document.querySelector('.grid')).not.toBeNull()
    expect(within(document.querySelector('.grid')).getByText('330')).toBeTruthy()
  })
})
