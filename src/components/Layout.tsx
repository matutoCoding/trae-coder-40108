import { NavLink, Outlet } from 'react-router-dom'
import { Home, Package, LogOut, Coins, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/', label: '首页', icon: Home },
  { path: '/batch', label: '批次', icon: Package },
  { path: '/outbound', label: '出库', icon: LogOut },
  { path: '/commission', label: '分账', icon: Coins },
  { path: '/settlement', label: '对账', icon: FileText },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-dark-900 font-body">
      <main className="pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-800 border-t border-dark-600 safe-bottom">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                  isActive ? 'text-accent-blue' : 'text-gray-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
