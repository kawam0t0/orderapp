import type { NextApiRequest, NextApiResponse } from "next"
import { google } from "googleapis"
import crypto from "crypto"

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

// 型定義
type Product = {
  id: string
  item_category: string
  item_name: string
  selectedSize?: string
  selectedColor?: string
  quantity: number
  price?: string | string[]
  item_price?: string | string[]
  partnerName?: string
  selectedQuantity?: number
}

type StoreInfo = {
  name: string
  email: string
  id: string
}

type PartnerInfo = {
  name: string
  email: string
  items: Product[]
}

type AvailableItem = {
  category: string
  name: string
  partnerName: string
  partnerEmail: string
}

// スプレッドシートに保存する前の数量処理を修正る関数
const processOrderItems = (items) => {
  return items.map((item) => {
    // 特定の販促グッズの場合は、selectedQuantity を quantity として使用
    if (specialPromotionalItems.some((name) => item.item_name.includes(name))) {
      // selectedQuantity が存在する場合はそれを使用、存在しない場合は元の quantity を使用
      const updatedQuantity = item.selectedQuantity ? Number(item.selectedQuantity) : item.quantity
      return {
        ...item,
        quantity: updatedQuantity, // 選択された数量を quantity として設定
      }
    }

    // その他の商品は従来通りの処理
    return item
  })
}

async function getAuthToken() {
  // 環境変数チェックを追加し、エラーメッセージを改善
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.warn("Google認証情報が設定されていません。")
    throw new Error("Google認証情報が設定されていません。")
  }

  try {
    // GOOGLE_APPLICATION_CREDENTIALS_JSONが設定されている場合、それを使用
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    }

    // 従来の方法（ファイルパス）
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
  } catch (error) {
    console.error("Auth error:", error)
    throw error
  }
}

// 発注番号生成
function generateOrderNumber(): string {
  const timestamp = Date.now().toString()
  const hash = crypto.createHash("md5").update(timestamp).digest("hex")
  const numericHash = Number.parseInt(hash.substring(0, 6), 16) % 100000
  return "ORD-" + numericHash.toString().padStart(5, "0")
}

// 商品情報とパートナー情報を取得する関数
async function getAvailableItemsWithPartners(): Promise<AvailableItem[]> {
  try {
    const auth = await getAuthToken()
    const sheets = google.sheets({
      version: "v4",
      auth,
    })

    // Available_itemsシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: "Available_items!A2:J", // J列までのデータを取得
    })

    if (!response.data.values) {
      console.log("Available_itemsシートにデータがありません")
      return []
    }

    console.log(`Available_itemsシートから ${response.data.values.length} 行のデータを取得しました`)

    // 商品データを処理
    const items = response.data.values.map((row) => {
      const category = row[0] || "" // A列: カテゴリ
      const name = row[2] || "" // C列: 商品名（修正：B列ではなくC列から取得）
      const partnerName = row[8] || "" // I列: パートナー名
      const partnerEmail = row[9] || "" // J列: パートナーメールアドレス

      // デバッグ用に各行のデータをログ出力
      if (partnerName && partnerEmail) {
        console.log(`商品データ: カテゴリ=${category}, 名前=${name}, パートナー=${partnerName}, メール=${partnerEmail}`)
      }

      return {
        category,
        name,
        partnerName,
        partnerEmail,
      }
    })

    // パートナー情報があるアイテムの数をカウント
    const itemsWithPartners = items.filter((item) => item.partnerName && item.partnerEmail)
    console.log(`パートナー情報がある商品: ${itemsWithPartners.length}/${items.length}`)

    return items
  } catch (error) {
    console.error("Error fetching available items:", error)
    return []
  }
}

// 商品名が一致するかどうかを判定する関数
function matchProductName(orderItemName: string, availableItemName: string): boolean {
  // 両方の商品名を小文字に変換して比較
  const normalizedOrderItem = orderItemName.toLowerCase().trim()
  const normalizedAvailableItem = availableItemName.toLowerCase().trim()

  // 完全一致の場合
  if (normalizedOrderItem === normalizedAvailableItem) {
    return true
  }

  // 部分一致の場合（どちらかがもう一方を含む）
  if (normalizedOrderItem.includes(normalizedAvailableItem) || normalizedAvailableItem.includes(normalizedOrderItem)) {
    return true
  }

  // 単語単位での一致チェック
  const orderWords = normalizedOrderItem.split(/\s+/)
  const availableWords = normalizedAvailableItem.split(/\s+/)

  // 共通する単語が多い場合に一致と判定
  const commonWords = orderWords.filter((word) => availableWords.includes(word))
  if (commonWords.length > 0 && commonWords.length >= Math.min(orderWords.length, availableWords.length) / 2) {
    return true
  }

  return false
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { items, storeInfo, totalAmount } = req.body as {
      items: Product[]
      storeInfo: StoreInfo
      totalAmount: number
    }

    if (!items || !storeInfo) {
      return res.status(400).json({ error: "Missing required data" })
    }

    // 商品情報を処理
    const processedItems = processOrderItems(items)

    const auth = await getAuthToken()
    const sheets = google.sheets({
      version: "v4",
      auth,
    })

    // 現在の日時を取得
    const now = new Date()
    const dateStr = now.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
    const timeStr = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })

    // 発注番号を生成
    const orderNumber = generateOrderNumber()

    // スプレッドシートに追加するデータを準備
    const rowData = new Array(47).fill("") // 十分な長さの配列を初期化（AT列とAU列を含む）

    // 基本情報を設定
    rowData[0] = orderNumber // A列: 発注番号
    rowData[1] = dateStr // B列: 発注日
    rowData[2] = timeStr // C列: 発注時間
    rowData[3] = storeInfo.name // D列: 店舗名
    rowData[4] = storeInfo.email // E列: メールアドレス

    // 商品情報を追加 (F列以降)
    processedItems.forEach((item, index) => {
      const baseIndex = 5 + index * 4 // 各商品は4列を使用
      if (baseIndex < rowData.length - 3) {
        rowData[baseIndex] = item.item_name
        rowData[baseIndex + 1] = item.selectedSize || ""
        rowData[baseIndex + 2] = item.selectedColor || ""
        rowData[baseIndex + 3] = item.quantity.toString() // 処理済みの数量を使用
      }
    })

    // スプレッドシートに行を追加
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: "Order_history!A1",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowData],
      },
    })

    // 発注確認メールを送信
    try {
      console.log("Preparing to send email to:", storeInfo.email)
      // baseUrlの取得方法を修正
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

      console.log("Using base URL for API calls:", baseUrl)

      const emailResponse = await fetch(`${baseUrl}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: storeInfo.email,
          subject: `【SPLASH'N'GO!】発注確認 (${orderNumber})`,
          orderNumber,
          storeName: storeInfo.name,
          items: processedItems,
          totalAmount: totalAmount || 0,
        }),
      })

      if (!emailResponse.ok) {
        console.error("メール送信に失敗しました:", await emailResponse.text())
      } else {
        console.log("メール送信成功:", await emailResponse.json())
      }
    } catch (emailError) {
      console.error("メール送信エラー:", emailError)
    }

    // 商品情報とパートナー情報を取得
    const availableItems = await getAvailableItemsWithPartners()

    // 発注された商品の一覧をログ出力
    console.log(
      "発注された商品:",
      processedItems.map((item) => item.item_name),
    )

    // パートナー別に商品をグループ化
    const partnerGroups: { [key: string]: PartnerInfo } = {}

    // 各商品のパートナー情報を設定
    processedItems.forEach((item) => {
      console.log(`商品 ${item.item_name} のパートナー情報を検索中...`)

      // 商品名に一致する商品情報を検索
      const matchingItems = availableItems.filter((avItem) => matchProductName(item.item_name, avItem.name))

      if (matchingItems.length > 0) {
        // 最も一致度の高い商品を選択（ここでは単純に最初のものを使用）
        const matchingItem = matchingItems[0]

        if (matchingItem.partnerName && matchingItem.partnerEmail) {
          const partnerName = matchingItem.partnerName
          const partnerEmail = matchingItem.partnerEmail

          console.log(`商品 ${item.item_name} のパートナー: ${partnerName}, メール: ${partnerEmail}`)

          // パートナーグループが存在しない場合は作成
          if (!partnerGroups[partnerName]) {
            partnerGroups[partnerName] = {
              name: partnerName,
              email: partnerEmail,
              items: [],
            }
          }

          // 商品をパートナーグループに追加
          partnerGroups[partnerName].items.push(item)
        } else {
          console.log(
            `商品 ${item.item_name} のパートナー情報が不完全です: 名前=${matchingItem.partnerName}, メール=${matchingItem.partnerEmail}`,
          )
        }
      } else {
        console.log(`商品 ${item.item_name} に一致する商品情報が見つかりません`)

        // 部分一致で検索してみる
        console.log(
          "Available_itemsシートの商品名一覧:",
          availableItems.map((item) => item.name),
        )
      }
    })

    // デバッグログを追加
    console.log(
      "Partner groups:",
      Object.values(partnerGroups).map((group) => ({
        partnerName: group.name,
        partnerEmail: group.email,
        itemCount: group.items.length,
        items: group.items.map((item) => item.item_name),
      })),
    )

    // パートナーグループが空の場合は早期リターン
    if (Object.keys(partnerGroups).length === 0) {
      console.log("パートナー商品がないため、パートナーメールは送信しません")
      res.status(200).json({ success: true, orderNumber })
      return
    }

    // 各パートナーにメールを送信（非同期処理を並列化）
    const partnerEmailPromises = Object.values(partnerGroups).map(async (partnerInfo) => {
      try {
        console.log(`Sending email to partner: ${partnerInfo.name} (${partnerInfo.email})`)
        // baseUrlの取得方法を修正
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

        console.log("Using base URL for partner email:", baseUrl)

        // パートナーメールの送信
        const partnerEmailResponse = await fetch(`${baseUrl}/api/send-partner-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: partnerInfo.email,
            subject: `【SPLASH'N'GO!】発注通知 (${orderNumber})`,
            orderNumber,
            storeName: storeInfo.name,
            items: partnerInfo.items,
          }),
        })

        const responseText = await partnerEmailResponse.text()
        if (!partnerEmailResponse.ok) {
          console.error(`${partnerInfo.name}へのメール送信に失敗しました:`, responseText)
        } else {
          console.log(`${partnerInfo.name}へのメール送信成功:`, responseText)
        }
      } catch (error) {
        console.error(`${partnerInfo.name}へのメール処理エラー:`, error)
      }
    })

    // パートナーメールの送信を待たずに成功レスポンスを返す
    // これにより、ユーザー体験が向上し、アプリのパフォーマンスが改善されます
    res.status(200).json({ success: true, orderNumber })

    // バックグラウンドでパートナーメールの送信を完了
    Promise.all(partnerEmailPromises).catch((error) => {
      console.error("Partner email background processing error:", error)
    })
  } catch (error) {
    console.error("Error saving order:", error)
    res.status(500).json({
      error: "Failed to save order data",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

