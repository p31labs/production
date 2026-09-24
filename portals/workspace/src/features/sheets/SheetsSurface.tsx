import { useState } from 'react'
import { MCP_TOOLS } from '@/lib/mcpTools'
import { pickleName } from '@/lib/pickleNames'

const COLS = ['A', 'B', 'C', 'D', 'E']
const ROWS = 12

type CellMap = Record<string, string>

function buildSeed(): CellMap {
  const m: CellMap = {}
  m.A1 = 'Category'; m.B1 = 'Q1 Budget'; m.C1 = 'Q2 Budget'; m.D1 = 'Status'; m.E1 = 'Owner'
  m.A2 = 'Server Hardware'; m.B2 = '1250.00'; m.C2 = '900.00'; m.D2 = 'Approved'; m.E2 = pickleName('caregiver-one')
  m.A3 = 'Encrypted Backups'; m.B3 = '450.00'; m.C3 = '450.00'; m.D3 = 'Pending'; m.E3 = pickleName('caregiver-two')
  return m
}

export function SheetsSurface() {
  const [cells, setCells] = useState<CellMap>(buildSeed)
  const [selected, setSelected] = useState('B3')
  const [formula, setFormula] = useState(cells.B3 ?? '')

  function selectCell(ref: string) {
    setSelected(ref)
    setFormula(cells[ref] ?? '')
  }

  function commitFormula(val: string) {
    setFormula(val)
    setCells((c) => ({ ...c, [selected]: val }))
  }

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.sheets} aria-label="Sheets surface">
      <div className="sheets-layout">
        <div className="sheets-formula-bar">
          <div className="cell-ref">{selected}</div>
          <div className="fx-label">fx</div>
          <input
            className="formula-input"
            value={formula}
            onChange={(e) => commitFormula(e.target.value)}
            aria-label="Formula bar input"
          />
        </div>

        <div className="sheet-grid-container">
          <table className="sheet-table">
            <thead>
              <tr>
                <th className="row-header">#</th>
                {COLS.map((c) => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, i) => i + 1).map((r) => (
                <tr key={r}>
                  <td className="row-header">{r}</td>
                  {COLS.map((c) => {
                    const ref = `${c}${r}`
                    return (
                      <td
                        key={ref}
                        className={selected === ref ? 'selected' : ''}
                        onClick={() => selectCell(ref)}
                        data-cell={ref}
                      >
                        {cells[ref] ?? ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default SheetsSurface