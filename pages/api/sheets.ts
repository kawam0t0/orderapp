import { google } from "googleapis"
import type { NextApiRequest, NextApiResponse } from "next"

async function getAuthToken() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set")
  }

  try {
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })
  } catch (error) {
    console.error("Auth error:", error)
    throw error
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { sheet } = req.query

    if (!process.env.SHEET_ID) {
      console.error("SHEET_ID is not set in environment variables")
      return res.status(500).json({ error: "Server configuration error: SHEET_ID is not set" })
    }

    try {
      const auth = await getAuthToken()
      const sheets = google.sheets({
        version: "v4",
        auth,
      })

      // Available_itemsシートの範囲を修正してJ列まで含める
      let range = ""
      if (sheet === "Available_items") {
        range = "Available_items!A2:J"
      } else if (sheet === "Order_history") {
        range = "Order_history!A2:AV" // 注文履歴は広い範囲を取得
      } else {
        range = `${sheet}`
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range: range,
      })

      if (!response.data.values) {
        return res.status(404).json({ error: "No data found" })
      }

      if (sheet === "Available_items") {
        // 商品データをより効率的に処理
        const processedItems = processAvailableItems(response.data.values)
        res.status(200).json(processedItems)
      } else if (sheet === "Order_history") {
        // 注文履歴データを処理
        const processedOrders = processOrderHistory(response.data.values)
        res.status(200).json(processedOrders)
      } else {
        res.status(200).json(response.data.values)
      }
    } catch (error) {
      console.error("Error details:", error)
      res.status(500).json({
        error: "Error fetching data from Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  } else {
    res.setHeader("Allow", ["GET"])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

// 商品データ処理を別関数に分離して最適化
function processAvailableItems(rows: any[][]) {
  const groupedItems = new Map()

  // スプレッドシートの各行を処理
  rows.forEach((row) => {
    const [id, category, name, color, size, amount, price, pricePerPiece, leadTime, partnerName] = row

    // 商品名をキーとして使用
    const key = name

    if (!groupedItems.has(key)) {
      // 新しい商品の場合、初期データを設定
      groupedItems.set(key, {
        id: id || Math.random().toString(36).substring(2, 9),
        category: category || "",
        name: name || "",
        colors: new Set(),
        sizes: new Set(),
        amounts: new Set(),
        prices: {},
        pricesPerPiece: {},
        leadTime: leadTime || "2週間",
        partnerName: partnerName || "",
      })
    }

    const item = groupedItems.get(key)

    // カラーとサイズを追加（存在する場合）
    if (color) item.colors.add(color)
    if (size) item.sizes.add(size)

    // 数量を追加（販促グッズの場合は特に重要）
    if (amount) {
      // 数値に変換して保存
      const amountValue = amount.toString().replace(/[^0-9]/g, "")
      if (amountValue) {
        const numAmount = Number.parseInt(amountValue, 10)
        item.amounts.add(numAmount)

        // 対応する価格も保存
        if (price) {
          item.prices[numAmount] = price
        }

        // 1個あたりの価格も保存
        if (pricePerPiece) {
          item.pricesPerPiece[numAmount] = pricePerPiece
        }
      }
    }
  })

  // グループ化したデータを配列に変換
  return Array.from(groupedItems.values()).map((item) => {
    // 数量を昇順にソート
    const sortedAmounts = Array.from(item.amounts).sort((a, b) => a - b)

    // 対応する価格の配列を作成
    const sortedPrices = sortedAmounts.map((amount) => item.prices[amount] || "0")

    // 対応する1個あたりの価格の配列を作成
    const sortedPricesPerPiece = sortedAmounts.map((amount) => item.pricesPerPiece[amount] || "0")

    return {
      id: item.id,
      category: item.category,
      name: item.name,
      colors: Array.from(item.colors),
      sizes: Array.from(item.sizes),
      amounts: sortedAmounts,
      prices: sortedPrices,
      pricesPerPiece: sortedPricesPerPiece,
      leadTime: item.leadTime,
      partnerName: item.partnerName,
    }
  })
}

// 特定の販促グッズリストを定義
const specialPromotionalItems = [
  "ポイントカード",
  "サブスクメンバーズカード",
  "サブスクフライヤー",
  "フリーチケット",
  "クーポン券",
  "名刺",
  "のぼり",
  "お年賀(マイクロファイバークロス)",
]

// 特定のアイテムかどうかを判定する関数
const isSpecialItem = (itemName: string): boolean => {
  return specialPromotionalItems.some((name) => itemName.includes(name))
}

// 注文履歴データを処理する関数
function processOrderHistory(rows: any[][]) {
  return rows.map((row, index) => {
    // 基本情報を抽出
    const orderNumber = row[0] || `ORD-${(index + 1).toString().padStart(5, "0")}`
    const orderDate = row[1] || ""
    const orderTime = row[2] || ""
    const storeName = row[3] || ""
    const email = row[4] || ""

    // 商品情報を抽出
    const items = []
    for (let i = 5; i < Math.min(row.length, 33); i += 4) {
      // 商品名が存在する場合のみ追加
      if (row[i]) {
        const itemName = row[i] || ""
        const itemSize = row[i + 1] || ""
        const itemColor = row[i + 2] || ""
        const itemQuantity = row[i + 3] || "1"

        items.push({
          name: itemName,
          size: itemSize,
          color: itemColor,
          quantity: itemQuantity,
        })
      }
    }

    // 出荷日とステータスを取得
    const shippingDate = row[45] || null // AT列（46番目、0から始まるので45）
    const status = row[46] || "処理中" // AU列（47番目、0から始まるので46）

    return {
      orderNumber,
      orderDate,
      orderTime,
      storeName,
      email,
      items,
      status,
      shippingDate,
    }
  })
}

