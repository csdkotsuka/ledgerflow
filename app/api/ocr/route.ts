import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
    try {
        const { image, mimeType } = await request.json()

        if (!image) {
            return NextResponse.json(
                { error: 'No image provided' },
                { status: 400 }
            )
        }

        // Remove data URL prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, '')
            .replace(/^data:application\/pdf;base64,/, '')

        // Get Gemini model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        // Create prompt for receipt data extraction
        const prompt = `あなたは領収書から情報を抽出する専門家です。
この画像から以下の情報を抽出してください：

1. 日付（YYYY-MM-DD形式）
2. 合計金額（数値のみ、税込）
3. 店舗名/仕入先名
4. 品目/摘要（簡潔に）
5. 税率（8または10、不明な場合は10）

以下のJSON形式で返してください：
{
  "date": "YYYY-MM-DD",
  "amount": 数値,
  "vendor": "店舗名",
  "description": "品目",
  "taxRate": 8 or 10
}

日付が不明な場合は今日の日付を使用してください。
金額は必ず数値型で返してください。
JSONのみを返し、他の説明は不要です。`

        // Call Gemini Vision API
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType || 'image/jpeg',
                },
            },
        ])

        const response = await result.response
        const text = response.text()

        // Parse JSON from response
        // Gemini sometimes wraps JSON in markdown code blocks
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from response')
        }

        const extractedData = JSON.parse(jsonMatch[0])

        // Validate extracted data
        if (!extractedData.date || !extractedData.amount || !extractedData.vendor) {
            throw new Error('Incomplete data extracted from receipt')
        }

        return NextResponse.json(extractedData)
    } catch (error) {
        console.error('OCR Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'OCR processing failed' },
            { status: 500 }
        )
    }
}
