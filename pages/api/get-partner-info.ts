import type { NextApiRequest, NextApiResponse } from "next"
import { google } from "googleapis"

async function getAuthToken() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set")
  }

  return new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { partnerName } = req.query

    if (!partnerName) {
      return res.status(400).json({ error: "パートナー名が指定されていません" })
    }

    const auth = await getAuthToken()
    const sheets = google.sheets({
      version: "v4",
      auth,
    })

    // partner_infoシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "partner_info!A2:C", // A:パートナーID, B:パートナー名, C:メールアドレス
    })

    if (!response.data.values) {
      return res.status(404).json({ error: "パートナー情報が見つかりません" })
    }

    // パートナー名が指定されている場合は効率的に検索
    const decodedPartnerName = decodeURIComponent(partnerName as string).trim()
    console.log("Searching for partner:", decodedPartnerName)

    // 指定されたパートナー名に一致するデータのみを抽出
    const matchingPartners = response.data.values
      .filter((row) => row[1] && row[1].trim() === decodedPartnerName)
      .map((row) => ({
        id: row[0] || "",
        name: row[1] || "",
        email: row[2] || "",
      }))

    console.log("Found partners:", matchingPartners.length)

    res.status(200).json({ partners: matchingPartners })
  } catch (error) {
    console.error("Error fetching partner info:", error)
    res.status(500).json({
      error: "Failed to fetch partner data",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

