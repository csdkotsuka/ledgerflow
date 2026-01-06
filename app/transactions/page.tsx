'use client'

// TODO: Remove this when authentication is implemented
const TEMP_USER_ID = '00000000-0000-0000-0000-000000000000'

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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type Account = { id: string, name: string, code: string }
type Transaction = {
    id: string
    transaction_date: string
    description: string
    debit_amount: number
    credit_amount: number
    debit_account: { name: string }
    credit_account: { name: string }
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [accounts, setAccounts] = useState<Account[]>([])

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [description, setDescription] = useState('')
    const [debitAccountId, setDebitAccountId] = useState('')
    const [creditAccountId, setCreditAccountId] = useState('')
    const [amount, setAmount] = useState('') // Simple single amount as they must match

    useEffect(() => {
        fetchTransactions()
        fetchAccounts()
    }, [])

    async function fetchAccounts() {
        const { data } = await supabase.from('accounts').select('id, name, code').order('code')
        setAccounts(data || [])
    }

    async function fetchTransactions() {
        setLoading(true)
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        id, transaction_date, description, debit_amount, credit_amount,
        debit_account:accounts!debit_account_id(name),
        credit_account:accounts!credit_account_id(name)
      `)
            .order('transaction_date', { ascending: false })
            .limit(50)

        if (error) console.error('Error fetching transactions:', error)
        else setTransactions(data as any || [])
        setLoading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!date || !debitAccountId || !creditAccountId || !amount) {
            alert('Please fill all fields')
            return
        }
        if (debitAccountId === creditAccountId) {
            alert('Debit and Credit accounts must be different')
            return
        }

        // Find Fiscal Year (Simplified: Create one if needed or find existing)
        // For this MVP, we need a fiscal year. I'll search for one covering the date.
        // If not found, I'll error out (User should create one in settings).
        const dateStr = format(date, 'yyyy-MM-dd')
        const { data: fyData } = await supabase
            .from('fiscal_years')
            .select('id')
            .lte('start_date', dateStr)
            .gte('end_date', dateStr)
            .limit(1)
            .single()

        if (!fyData) {
            alert('No open fiscal year found for this date. Please create a fiscal year first.')
            return
        }

        const val = parseFloat(amount)

        const { error } = await supabase.from('transactions').insert({
            user_id: TEMP_USER_ID,
            transaction_date: dateStr,
            description,
            debit_account_id: debitAccountId,
            credit_account_id: creditAccountId,
            debit_amount: val,
            credit_amount: val,
            fiscal_year_id: fyData.id,
            // Assuming no tax/sub-account for MVP simplicity unless requested
        })

        if (error) {
            alert('Error saving transaction: ' + error.message)
        } else {
            setOpen(false)
            setDescription('')
            setAmount('')
            fetchTransactions()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Transactions</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>+ New Transaction</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>New Transaction</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 flex flex-col">
                                    <Label>Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !date && "text-muted-foreground"
                                                )}
                                            >
                                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={date}
                                                onSelect={setDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Debit Account (借方)</Label>
                                    <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.code} {acc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Credit Account (貸方)</Label>
                                    <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.code} {acc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Transaction description" />
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="submit">Save Transaction</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">Loading...</TableCell>
                            </TableRow>
                        ) : transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No transactions found.</TableCell>
                            </TableRow>
                        ) : (
                            transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(new Date(tx.transaction_date), 'yyyy-MM-dd')}</TableCell>
                                    <TableCell>{(tx as any).debit_account?.name}</TableCell>
                                    <TableCell>{(tx as any).credit_account?.name}</TableCell>
                                    <TableCell className="font-mono">{tx.debit_amount.toLocaleString()}</TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
