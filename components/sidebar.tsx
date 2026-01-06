'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    FileText,
    CreditCard,
    Users,
    Settings,
    BookOpen
} from 'lucide-react'

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', icon: FileText },
    { href: '/accounts', label: 'Accounts', icon: BookOpen },
    { href: '/sub-accounts', label: 'Sub Accounts', icon: BookOpen },
    { href: '/vendors', label: 'Vendors', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col">
            <div className="text-2xl font-bold mb-8 px-2">LedgerFlow</div>
            <nav className="space-y-2 flex-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                                isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                            )}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
            {/* User profile could go here */}
        </div>
    )
}
