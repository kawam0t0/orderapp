import type { NextApiRequest, NextApiResponse } from "next"
import nodemailer from "nodemailer"

// メール送信用のトランスポーターを設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

type EmailItem = {
  item_name: string // nameをitem_nameに変更
  selectedSize?: string
  selectedColor?: string
  quantity: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { to, subject, orderNumber, storeName, items, totalAmount } = req.body as {
      to: string
      subject: string
      orderNumber: string
      storeName: string
      items: EmailItem[]
      totalAmount: number
    }

    if (!to || !subject || !orderNumber || !storeName || !items) {
      return res.status(400).json({ error: "必要なパラメータが不足しています" })
    }

    // 商品リストのHTMLを生成
    const itemsHtml = items
      .map(
        (item: EmailItem) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.item_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.selectedSize || ""}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.selectedColor || ""}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
    </tr>
  `,
      )
      .join("")

    // メール本文のHTML
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">SPLASH'N'GO!</h1>
          <p style="margin: 5px 0 0;">発注確認メール</p>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <p>${storeName} 様</p>
          <p>この度はご発注いただき、誠にありがとうございます。<br>以下の内容で発注を承りました。</p>
          
          <div style="background-color: white; border-radius: 8px; padding: 15px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin-top: 0; color: #1e40af;">発注情報</h2>
            <p><strong>発注番号:</strong> ${orderNumber}</p>
            <p><strong>発注日時:</strong> ${new Date().toLocaleString("ja-JP")}</p>
            
            <h3 style="margin-bottom: 10px; color: #1e40af;">発注商品</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 8px; text-align: left;">商品名</th>
                  <th style="padding: 8px; text-align: left;">サイズ</th>
                  <th style="padding: 8px; text-align: left;">カラー</th>
                  <th style="padding: 8px; text-align: center;">数量</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <p style="text-align: right; margin-top: 15px; font-weight: bold;">
              合計金額: ¥${totalAmount.toLocaleString()}
            </p>
          </div>
          
          <p>発注内容に関するお問い合わせは、下記の連絡先までお願いいたします。</p>
          <p>今後ともSPLASH'N'GO!をよろしくお願いいたします。</p>
        </div>
        
        <div style="background-color: #1f2937; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2025 SPLASH'N'GO! All rights reserved.</p>
          <p>お問い合わせ: info@splashbrothers.co.jp | 050-1748-0947</p>
        </div>
      </div>
    `

    console.log("Sending email to:", to)
    console.log("SMTP settings:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER ? "Set" : "Not set",
      from: process.env.SMTP_FROM,
    })

    // メール送信
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "\"SPLASH'N'GO!\" <noreply@splashngo.example.com>",
      to,
      subject,
      html,
    })

    console.log("Email sent successfully:", info.messageId)
    res.status(200).json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error("メール送信エラー:", error)
    res
      .status(500)
      .json({ error: "メールの送信に失敗しました", details: error instanceof Error ? error.message : "Unknown error" })
  }
}

