'use client'

// TODO: Remove this when authentication is implemented
const TEMP_USER_ID = '00000000-0000-0000-0000-000000000000'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function SettingsPage() {
    const [years, setYears] = useState<any[]>([])
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchYears()
    }, [])

    async function fetchYears() {
        const { data } = await supabase.from('fiscal_years').select('*').order('start_date', { ascending: false })
        setYears(data || [])
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()

        const { error } = await supabase.from('fiscal_years').insert({
            user_id: TEMP_USER_ID,
            name,
            start_date: startDate,
            end_date: endDate
        })

        if (error) alert('Error: ' + error.message)
        else {
            setName('')
            setStartDate('')
            setEndDate('')
            fetchYears()
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Fiscal Years</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleCreate} className="grid grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="FY 2026" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                        </div>
                        <Button type="submit">Add Fiscal Year</Button>
                    </form>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Start</TableHead>
                                <TableHead>End</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {years.map(fy => (
                                <TableRow key={fy.id}>
                                    <TableCell>{fy.name}</TableCell>
                                    <TableCell>{fy.start_date}</TableCell>
                                    <TableCell>{fy.end_date}</TableCell>
                                    <TableCell>{fy.is_locked ? 'Locked' : 'Open'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
