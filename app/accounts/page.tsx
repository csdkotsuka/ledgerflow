'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Account = {
    id: string
    code: string
    name: string
    type: string
}

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    // Form State
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [type, setType] = useState('EXPENSE')

    useEffect(() => {
        fetchAccounts()
    }, [])

    async function fetchAccounts() {
        setLoading(true)
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .order('code', { ascending: true })

        if (error) console.error('Error fetching accounts:', error)
        else setAccounts(data || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        // Get current user (simple check, assume auth is handled or RLS relies on session)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            alert('Please log in first (Auth not fully implemented in UI but required for RLS)')
            return
        }

        const { error } = await supabase.from('accounts').insert({
            user_id: user.id,
            code,
            name,
            type
        })

        if (error) {
            alert('Error creating account: ' + error.message)
        } else {
            setOpen(false)
            setCode('')
            setName('')
            fetchAccounts()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Accounts</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>+ Add Account</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Account</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Code</Label>
                                <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 1001" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cash" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ASSET">Asset (資産)</SelectItem>
                                        <SelectItem value="LIABILITY">Liability (負債)</SelectItem>
                                        <SelectItem value="EQUITY">Equity (純資産)</SelectItem>
                                        <SelectItem value="REVENUE">Revenue (収益)</SelectItem>
                                        <SelectItem value="EXPENSE">Expense (費用)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="submit">Save</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">Loading...</TableCell>
                            </TableRow>
                        ) : accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No accounts found.</TableCell>
                            </TableRow>
                        ) : (
                            accounts.map(acc => (
                                <TableRow key={acc.id}>
                                    <TableCell className="font-mono">{acc.code}</TableCell>
                                    <TableCell>{acc.name}</TableCell>
                                    <TableCell><span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">{acc.type}</span></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
