'use client'

// Temporary design preview — delete after decision is made

const ROWS = [
  { its_no: 30412345, name: 'Aliasger Mumin', gender: 'Male', status: 'Active', canEdit: true },
  { its_no: 30498765, name: 'Fatema Mala', gender: 'Female', status: 'Active', canEdit: true },
  { its_no: 30411111, name: 'Hussain Bhori', gender: 'Male', status: 'Inactive', canEdit: false },
]

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  )
}

function TableShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">{title}</h2>
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">ITS No</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Name</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Gender</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Status</th>
              <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

// ── Option A: Text links with separators ───────────────────────────────────
function VariantA() {
  return (
    <TableShell title="Option A — Text links with separators (always visible)">
      {ROWS.map(r => (
        <tr key={r.its_no} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
          <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.its_no}</td>
          <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
          <td className="px-4 py-3 text-sm text-gray-600">{r.gender}</td>
          <td className="px-4 py-3">
            <Badge label={r.status} color={r.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'} />
          </td>
          <td className="px-4 py-3 text-right">
            <span className="inline-flex items-center gap-0 text-sm">
              {r.canEdit && (
                <>
                  <button className="text-gray-500 hover:text-gray-900 transition-colors font-medium px-1">Edit</button>
                  <span className="text-gray-300 select-none">·</span>
                </>
              )}
              <button className="text-gray-500 hover:text-gray-900 transition-colors font-medium px-1">Request</button>
              <span className="text-gray-300 select-none">·</span>
              <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors font-medium px-1">View →</a>
            </span>
          </td>
        </tr>
      ))}
    </TableShell>
  )
}

// ── Option B: Hover-reveal pill buttons ───────────────────────────────────
function VariantB() {
  return (
    <TableShell title="Option B — Hover-reveal pill buttons (Edit + Request appear on hover)">
      {ROWS.map(r => (
        <tr key={r.its_no} className="group hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
          <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.its_no}</td>
          <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
          <td className="px-4 py-3 text-sm text-gray-600">{r.gender}</td>
          <td className="px-4 py-3">
            <Badge label={r.status} color={r.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'} />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1.5">
              {r.canEdit && (
                <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                  Edit
                </button>
              )}
              <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                Request
              </button>
              <a href="#" className="px-2.5 py-1 rounded-md text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                View →
              </a>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  )
}

// ── Option C: Compact labeled pill buttons ────────────────────────────────
function VariantC() {
  return (
    <TableShell title="Option C — Compact labeled pill buttons (always visible)">
      {ROWS.map(r => (
        <tr key={r.its_no} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
          <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.its_no}</td>
          <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
          <td className="px-4 py-3 text-sm text-gray-600">{r.gender}</td>
          <td className="px-4 py-3">
            <Badge label={r.status} color={r.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'} />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1.5">
              {r.canEdit && (
                <button className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                  Edit
                </button>
              )}
              <button className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                Request
              </button>
              <a href="#" className="px-2.5 py-1 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors">
                View →
              </a>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  )
}

// ── Option D: Dropdown menu ───────────────────────────────────────────────
function VariantD() {
  return (
    <TableShell title="Option D — Dropdown ··· menu (smallest column, one extra click)">
      {ROWS.map(r => (
        <tr key={r.its_no} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
          <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.its_no}</td>
          <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
          <td className="px-4 py-3 text-sm text-gray-600">{r.gender}</td>
          <td className="px-4 py-3">
            <Badge label={r.status} color={r.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'} />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="relative inline-block group/dd">
              <button className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-xs font-bold tracking-widest">
                ···
              </button>
              {/* Dropdown always shown in preview so you can see it */}
              <div className="absolute right-0 top-full mt-1 z-10 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {r.canEdit && (
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                    <span className="text-xs">✏️</span> Edit
                  </button>
                )}
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                  <span className="text-xs">📋</span> Request
                </button>
                <a href="#" className="block px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2">
                  <span className="text-xs">→</span> View Profile
                </a>
              </div>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  )
}

export default function DesignPreview() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Row Action Design Preview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Compare all 4 options. Third row in each table has no Edit button (non-SuperAdmin row).
            Option B: hover over a row to see Edit/Request reveal.
          </p>
        </div>
        <VariantA />
        <VariantB />
        <VariantC />
        <VariantD />
        <p className="text-xs text-gray-400 text-center mt-4">
          Temporary preview page — delete <code>app/design-preview/</code> after decision is made.
        </p>
      </div>
    </div>
  )
}
