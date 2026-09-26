import { beforeAll, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import VirtualGrid from './VirtualGrid'
import { addrOf } from '../utils/grid'

// jsdom does not implement ResizeObserver; the grid only needs it to exist.
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const noop = () => {}

// A sheet shaped exactly like the snapshot the server pushes once the
// WebSocket handshake completes (values already computed by the backend).
const sheet = {
  name: '预算表',
  rows: 1000,
  cols: 26,
  cells: {
    A1: { sheet: '预算表', cell: 'A1', raw: '项目', value: '项目' },
    B1: { sheet: '预算表', cell: 'B1', raw: '金额', value: '金额' },
    B2: { sheet: '预算表', cell: 'B2', raw: '=SUM(B3:B5)', value: '42', kind: 'number' },
  },
}

function gridProps(extra) {
  return {
    me: 'me',
    presence: { me: 'me', peers: [] },
    selection: null,
    onSelect: noop,
    cellAt: () => null,
    onCommitCell: noop,
    endEdit: noop,
    commitAndMove: noop,
    editing: null,
    beginEdit: noop,
    updateEditText: noop,
    clearPicked: noop,
    cancelEdit: noop,
    ...extra,
  }
}

describe('VirtualGrid', () => {
  // Regression: the app mounts with no sheet, then the workbook snapshot
  // arrives and the grid must grow. The hook set must not change between
  // those two renders — a hook behind the `if (!sheet) return null` early
  // return crashed the whole grid in production builds with
  // "Rendered more hooks than during the previous render".
  it('grows the grid when the workbook snapshot arrives after mount', () => {
    const cellAt = (s, c, r) => sheet.cells[addrOf(c, r)] ?? null

    const { container, rerender } = render(
      <VirtualGrid {...gridProps({ sheet: null })} />,
    )
    expect(container.querySelectorAll('.cell')).toHaveLength(0)

    // Snapshot arrives: same component instance, now with data.
    rerender(<VirtualGrid {...gridProps({ sheet, cellAt })} />)

    const cells = container.querySelectorAll('.cell')
    expect(cells.length).toBeGreaterThan(0)
    // Formula results computed by the backend are on the page.
    expect(container.textContent).toContain('42')
    expect(container.textContent).toContain('项目')
    // Row/column headers came up too.
    expect(container.querySelectorAll('.row-header').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.col-header').length).toBeGreaterThan(0)
  })

  it('keeps rendering when data updates after the grid is up', () => {
    const cellAt = (s, c, r) => sheet.cells[addrOf(c, r)] ?? null
    const { container, rerender } = render(
      <VirtualGrid {...gridProps({ sheet, cellAt })} />,
    )
    const before = container.querySelectorAll('.cell').length
    expect(before).toBeGreaterThan(0)

    // A patch produces a new sheet object; the grid must stay alive.
    rerender(<VirtualGrid {...gridProps({ sheet: { ...sheet }, cellAt })} />)
    expect(container.querySelectorAll('.cell').length).toBe(before)
  })
})
