'use client'

import { useState, useCallback } from 'react'
import { Upload, X, FileImage, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ReceiptUploadProps {
    onOCRComplete: (data: {
        date: string
        amount: number
        vendor: string
        description: string
        taxRate?: number
    }) => void
    onFileUpload: (file: File) => Promise<string> // Returns file URL
}

export function ReceiptUpload({ onOCRComplete, onFileUpload }: ReceiptUploadProps) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
        }
    }

    const handleFile = (selectedFile: File) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a valid image (JPEG, PNG) or PDF file')
            return
        }

        // Validate file size (10MB max)
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB')
            return
        }

        setFile(selectedFile)
        setError(null)

        // Create preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(selectedFile)
        } else {
            setPreview(null)
        }
    }

    const processReceipt = async () => {
        if (!file) return

        setLoading(true)
        setError(null)

        try {
            // Upload file to Supabase Storage
            const fileUrl = await onFileUpload(file)

            // Convert file to base64 for OCR
            const reader = new FileReader()
            reader.onloadend = async () => {
                const base64 = reader.result as string

                // Call OCR API
                const response = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image: base64,
                        mimeType: file.type,
                    }),
                })

                if (!response.ok) {
                    throw new Error('OCR processing failed')
                }

                const data = await response.json()
                onOCRComplete({ ...data, receiptUrl: fileUrl })
            }
            reader.readAsDataURL(file)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process receipt')
        } finally {
            setLoading(false)
        }
    }

    const clearFile = () => {
        setFile(null)
        setPreview(null)
        setError(null)
    }

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Upload Receipt</h3>
                    {file && (
                        <Button variant="ghost" size="sm" onClick={clearFile}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {!file ? (
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 mb-2">
                            Drag and drop your receipt here, or click to select
                        </p>
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handleChange}
                            capture="environment" // Enable camera on mobile
                        />
                        <label htmlFor="file-upload">
                            <Button variant="outline" className="cursor-pointer" asChild>
                                <span>Choose File</span>
                            </Button>
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                            Supports: JPEG, PNG, PDF (max 10MB)
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {preview ? (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Receipt preview"
                                    className="max-h-64 mx-auto rounded-lg border"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
                                <FileImage className="h-16 w-16 text-gray-400" />
                                <div className="ml-4">
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={processReceipt}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Process Receipt'
                            )}
                        </Button>
                    </div>
                )}

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                        {error}
                    </div>
                )}
            </div>
        </Card>
    )
}
