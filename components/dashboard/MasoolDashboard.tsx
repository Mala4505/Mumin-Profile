import Link from 'next/link'
import type { MasoolStats } from '@/lib/dashboard/getStats'
import StatCard from './StatCard'
import SubsectorMuminChart from './charts/SubsectorMuminChart'
import BuildingFlatsChart from './charts/BuildingFlatsChart'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Users, LayoutGrid, Building, ArrowRight } from "lucide-react"

interface Props {
  stats: MasoolStats
}

export default function MasoolDashboard({ stats }: Props) {
  const sectorLabel = stats.sectorNames.join(', ') || 'Unassigned'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {stats.sectorNames.length > 1 ? 'My Sectors' : 'My Sector'}: {sectorLabel}
        </h1>
        <p className="text-muted-foreground mt-1">Sector overview and subsector management</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Mumineen"
          value={stats.muminCount}
          subtitle="Across all subsectors"
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <StatCard
          title="Subsectors"
          value={stats.subsectorCount}
          subtitle={`In ${stats.sectorNames.length > 1 ? 'assigned sectors' : sectorLabel}`}
          icon={<LayoutGrid className="w-5 h-5 text-secondary-foreground" />}
          iconBg="bg-secondary/20"
          iconColor="text-secondary-foreground"
        />
        <StatCard
          title="Families"
          value={stats.totalFamilies}
          subtitle="By Sabeel no."
          icon={<Users className="w-5 h-5 text-teal-600" />}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Buildings"
          value={stats.totalBuildings}
          subtitle="In this sector"
          icon={<Building className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Flats"
          value={stats.totalFlats}
          subtitle="By PACI no."
          icon={<Building className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* Masools */}
      {stats.sector_masools.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Masools in My Sector</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ITS No</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
                </tr>
              </thead>
              <tbody>
                {stats.sector_masools.map((m, idx) => (
                  <tr key={m.its_no} className={`hover:bg-muted/20 transition-colors ${idx !== stats.sector_masools.length - 1 ? 'border-b border-border' : ''}`}>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.its_no}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.phone ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subsector Cards with Collapsible Musaids */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Subsector Breakdown</h2>
        {stats.subsectors.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No subsectors assigned to this sector yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.subsectors.map(ss => {
              const pct = stats.muminCount > 0
                ? Math.round((ss.mumin_count / stats.muminCount) * 100)
                : 0
              return (
                <Card key={ss.subsector_id} className="hover:border-primary/40 hover:shadow-md transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{ss.subsector_name}</span>
                      <span className="text-sm font-bold text-primary">{ss.mumin_count}</span>
                    </CardTitle>
                    {stats.sectorNames.length > 1 && (
                      <p className="text-xs text-muted-foreground">{ss.sector_name}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      {ss.mumin_count} member{ss.mumin_count !== 1 ? 's' : ''} · {pct}% of total
                    </p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Collapsible>
                      <CollapsibleTrigger className="text-sm font-medium text-primary hover:underline">
                        View Musaids
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-1">
                        {ss.musaids.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No Musaid assigned</p>
                        ) : (
                          ss.musaids.map(m => (
                            <div
                              key={m.its_no}
                              className="flex items-center gap-3 text-xs text-muted-foreground"
                            >
                              <span className="text-foreground font-medium">{m.name}</span>
                              <span className="font-mono">{m.its_no}</span>
                              <span>{m.phone ?? "—"}</span>
                            </div>
                          ))
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
      {/* Charts */}
      <SubsectorMuminChart subsectors={stats.subsectors} />
      <BuildingFlatsChart buildings={stats.buildings} />

      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          View All Members
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}



// import Link from 'next/link'
// import type { MasoolStats } from '@/lib/dashboard/getStats'
// import StatCard from './StatCard'
// import SubsectorMuminChart from './charts/SubsectorMuminChart'
// import BuildingFlatsChart from './charts/BuildingFlatsChart'
// import {
//   Accordion,
//   AccordionItem,
//   AccordionTrigger,
//   AccordionContent,
// } from "@/components/ui/accordion"
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
// import { Users, LayoutGrid, Building, ArrowRight } from "lucide-react"  // 👈 lucide icons

// interface Props {
//   stats: MasoolStats
// }

// export default function MasoolDashboard({ stats }: Props) {
//   const sectorLabel = stats.sectorNames.join(', ') || 'Unassigned'

//   return (
//     <div className="space-y-8">
//       {/* Header */}
//       <div>
//         <h1 className="text-2xl font-bold text-foreground">
//           {stats.sectorNames.length > 1 ? 'My Sectors' : 'My Sector'}: {sectorLabel}
//         </h1>
//         <p className="text-muted-foreground mt-1">Sector overview and subsector management</p>
//       </div>

//       {/* Stat Cards */}
//       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
//         <StatCard
//           title="Total Mumineen"
//           value={stats.muminCount}
//           subtitle="Across all subsectors"
//           icon={<Users className="w-5 h-5 text-primary" />}
//           iconBg="bg-primary/10"
//           iconColor="text-primary"
//         />
//         <StatCard
//           title="Subsectors"
//           value={stats.subsectorCount}
//           subtitle={`In ${stats.sectorNames.length > 1 ? 'assigned sectors' : sectorLabel}`}
//           icon={<LayoutGrid className="w-5 h-5 text-secondary-foreground" />}
//           iconBg="bg-secondary/20"
//           iconColor="text-secondary-foreground"
//         />
//         <StatCard
//           title="Families"
//           value={stats.totalFamilies}
//           subtitle="By Sabeel no."
//           icon={<Users className="w-5 h-5 text-teal-600" />}
//           iconBg="bg-teal-100"
//           iconColor="text-teal-600"
//         />
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <StatCard
//           title="Buildings"
//           value={stats.totalBuildings}
//           subtitle="In this sector"
//           icon={<Building className="w-5 h-5 text-blue-600" />}
//           iconBg="bg-blue-100"
//           iconColor="text-blue-600"
//         />
//         <StatCard
//           title="Flats"
//           value={stats.totalFlats}
//           subtitle="By PACI no."
//           icon={<Building className="w-5 h-5 text-amber-600" />}
//           iconBg="bg-amber-100"
//           iconColor="text-amber-600"
//         />
//       </div>

//       {/* Masools */}
//       {stats.sector_masools.length > 0 && (
//         <div>
//           <h2 className="text-lg font-semibold mb-3">Masools in My Sector</h2>
//           <div className="bg-card border border-border rounded-lg overflow-hidden">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="bg-muted/50 border-b border-border">
//                   <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
//                   <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ITS No</th>
//                   <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stats.sector_masools.map((m, idx) => (
//                   <tr key={m.its_no} className={`hover:bg-muted/20 transition-colors ${idx !== stats.sector_masools.length - 1 ? 'border-b border-border' : ''}`}>
//                     <td className="px-4 py-3 font-medium">{m.name}</td>
//                     <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.its_no}</td>
//                     <td className="px-4 py-3 text-muted-foreground">{m.phone ?? '—'}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* Subsector Accordion */}
//       <div>
//         <h2 className="text-lg font-semibold mb-4">Subsectors & Musaids</h2>
//         {stats.subsectors.length === 0 ? (
//           <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
//             No subsectors assigned to this sector yet.
//           </div>
//         ) : (
//           <Accordion type="multiple" className="w-full space-y-2">
//             {stats.subsectors.map(ss => (
//               <AccordionItem key={ss.subsector_id} value={`ss-${ss.subsector_id}`}>
//                 <AccordionTrigger>
//                   <div className="flex justify-between w-full">
//                     <span className="font-medium">{ss.subsector_name}</span>
//                     <span className="text-sm text-muted-foreground">{ss.mumin_count} members</span>
//                   </div>
//                 </AccordionTrigger>
//                 <AccordionContent>
//                   <Card>
//                     <CardHeader>
//                       <CardTitle>Musaids</CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                       {ss.musaids.length === 0 ? (
//                         <p className="text-xs text-muted-foreground italic">No Musaid assigned</p>
//                       ) : (
//                         <ul className="space-y-1">
//                           {ss.musaids.map(m => (
//                             <li key={m.its_no} className="flex items-center gap-2 text-sm">
//                               <span className="font-medium">{m.name}</span>
//                               <span className="text-muted-foreground text-xs">{m.phone ?? "—"}</span>
//                             </li>
//                           ))}
//                         </ul>
//                       )}
//                     </CardContent>
//                   </Card>
//                 </AccordionContent>
//               </AccordionItem>
//             ))}
//           </Accordion>
//         )}
//       </div>




//       {/* Charts */}
//       <SubsectorMuminChart subsectors={stats.subsectors} />
//       <BuildingFlatsChart buildings={stats.buildings} />

//       <div>
//         <Link
//           href="/members"
//           className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
//         >
//           View All Members
//           <ArrowRight className="w-4 h-4" />
//         </Link>
//       </div>
//     </div>
//   )
// }
