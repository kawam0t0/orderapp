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

// 特定のアイテムかどうかを判定する関数
const isSpecialItem = (itemName: string): boolean => {
  return specialPromotionalItems.some((name) => itemName.includes(name))
}

// スプレッドシートに保存する前の数量処理を修正する関数
const processOrderItems = (items: Product[]) => {
  return items.map((item) => {
    // 特定の販促グッズの場合は、selectedQuantityを数量として使用
    if (isSpecialItem(item.item_name) && item.selectedQuantity) {
      return {
        ...item,
        quantity: item.selectedQuantity, // selectedQuantityを数量として使用
      }
    }

    // 販促グッズで選択数量がある場合は、その数量を使用
    if (item.item_category === "販促グッズ" && item.selectedQuantity) {
      return {
        ...item,
        quantity: item.selectedQuantity, // 選択された数量を使用
      }
    }

    // その他の商品は従来通りの処理
    return item
  })
}

async function getAuthToken() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set")
  }

  return new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
}

// 発注番号生成
function generateOrderNumber(): string {
  const timestamp = Date.now().toString()
  const hash = crypto.createHash("md5").update(timestamp).digest("hex")
  const numericHash = Number.parseInt(hash.substring(0, 6), 16) % 100000
  return "ORD-" + numericHash.toString().padStart(5, "0")
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
        rowData[baseIndex + 3] = item.quantity.toString()
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
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

    // パートナー別に商品をグループ化
    const partnerItems = new Map<string, Product[]>()

    // パートナー名が設定されている商品をグループ化
    processedItems.forEach((item) => {
      if (item.partnerName) {
        if (!partnerItems.has(item.partnerName)) {
          partnerItems.set(item.partnerName, [])
        }
        partnerItems.get(item.partnerName)?.push(item)
      }
    })

    // 各パートナーにメールを送信（非同期処理を並列化）
    const partnerEmailPromises = Array.from(partnerItems.entries()).map(async ([partnerName, partnerProducts]) => {
      try {
        console.log(`Sending email to partner: ${partnerName}`)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

        // パートナー情報を取得
        const partnerResponse = await fetch(
          `${baseUrl}/api/get-partner-info?partnerName=${encodeURIComponent(partnerName)}`,
        )

        if (!partnerResponse.ok) {
          throw new Error(`パートナー情報の取得に失敗しました: ${partnerName}`)
        }

        const partnerData = await partnerResponse.json()
        console.log(`Partner data for ${partnerName}:`, partnerData.partners?.length || 0)

        if (partnerData.partners && partnerData.partners.length > 0) {
          const partnerEmail = partnerData.partners[0].email

          if (partnerEmail) {
            console.log(`Sending partner email to: ${partnerEmail}`)

            // パートナーメールの送信 - 件名からパートナー名を削除
            const partnerEmailResponse = await fetch(`${baseUrl}/api/send-partner-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: partnerEmail,
                subject: `【SPLASH'N'GO!】発注通知 (${orderNumber})`, // パートナー名を削除
                orderNumber,
                storeName: storeInfo.name,
                items: partnerProducts,
              }),
            })

            if (!partnerEmailResponse.ok) {
              console.error(`${partnerName}へのメール送信に失敗しました:`, await partnerEmailResponse.text())
            } else {
              console.log(`${partnerName}へのメール送信成功`)
            }
          } else {
            console.error(`${partnerName}のメールアドレスが見つかりません`)
          }
        } else {
          console.error(`${partnerName}の情報が見つかりません`)
        }
      } catch (error) {
        console.error(`${partnerName}へのメール処理エラー:`, error)
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

