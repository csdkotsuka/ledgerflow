'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CreditCard, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

type DashboardStats = {
  totalRevenue: number
  totalExpenses: number
  activeAccounts: number
  transactionCount: number
}

type RecentTransaction = {
  id: string
  transaction_date: string
  description: string
  debit_amount: number
  credit_amount: number
  debit_account: { name: string, account_type: string }
  credit_account: { name: string, account_type: string }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    activeAccounts: 0,
    transactionCount: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch all transactions with account details
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          description,
          debit_amount,
          credit_amount,
          debit_account:accounts!transactions_debit_account_id_fkey(name, account_type),
          credit_account:accounts!transactions_credit_account_id_fkey(name, account_type)
        `)
        .order('transaction_date', { ascending: false })

      if (txError) throw txError

      // Fetch account count
      const { count: accountCount, error: accountError } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })

      if (accountError) throw accountError

      // Calculate statistics
      let revenue = 0
      let expenses = 0

      transactions?.forEach((tx: any) => {
        // Revenue: credit to revenue accounts (account_type = 'REVENUE')
        if (tx.credit_account?.account_type === 'REVENUE') {
          revenue += tx.credit_amount || 0
        }
        // Expenses: debit to expense accounts (account_type = 'EXPENSE')
        if (tx.debit_account?.account_type === 'EXPENSE') {
          expenses += tx.debit_amount || 0
        }
      })

      setStats({
        totalRevenue: revenue,
        totalExpenses: expenses,
        activeAccounts: accountCount || 0,
        transactionCount: transactions?.length || 0,
      })

      setRecentTransactions((transactions || []).slice(0, 5) as RecentTransaction[])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.transactionCount} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From expense accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{(stats.totalRevenue - stats.totalExpenses).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue - Expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAccounts}</div>
            <p className="text-xs text-muted-foreground">Accounts configured</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b pb-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{tx.description || 'No description'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.transaction_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.debit_account?.name} → {tx.credit_account?.name}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      ¥{(tx.debit_amount || tx.credit_amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Transactions</span>
                <span className="text-sm font-medium">{stats.transactionCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Transaction</span>
                <span className="text-sm font-medium">
                  ¥{stats.transactionCount > 0
                    ? Math.round(stats.totalExpenses / stats.transactionCount).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Accounts</span>
                <span className="text-sm font-medium">{stats.activeAccounts}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
