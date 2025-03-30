import type { NextApiRequest, NextApiResponse } from "next"
import { google } from "googleapis"

async function getAuthToken() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set")
  }

  return new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { orderNumber, shippingDate } = req.body

    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required" })
    }

    const auth = await getAuthToken()
    const sheets = google.sheets({
      version: "v4",
      auth,
    })

    // 注文番号に一致する行を検索
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Order_history!A2:A",
    })

    if (!response.data.values) {
      return res.status(404).json({ error: "No orders found" })
    }

    // 注文番号に一致する行のインデックスを検索
    const rowIndex = response.data.values.findIndex((row) => row[0] === orderNumber)

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Order not found" })
    }

    // 実際のスプレッドシートの行番号（1-indexed）
    const actualRowIndex = rowIndex + 2 // ヘッダー行 + 0-indexedの調整

    // 出荷日を更新（AT列 = 46列目）
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `Order_history!AT${actualRowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[shippingDate]],
      },
    })

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("Error updating shipping date:", error)
    res.status(500).json({
      error: "Failed to update shipping date",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

