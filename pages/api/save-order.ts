import type { NextApiRequest, NextApiResponse } from "next"
import { v4 as uuidv4 } from "uuid"
import { getSession } from "next-auth/react"

type CartItem = {
  id: string
  item_category: string
  item_name: string
  item_price: string
  lead_time: string
  selectedColor?: string
  selectedSize?: string
  selectedQuantity?: number | string
  quantity: number
  partnerName?: string
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    try {
      const session = await getSession({ req })

      if (!session) {
        return res.status(401).json({ message: "Not authenticated" })
      }

      const { cartItems, totalPrice, shippingAddress } = req.body

      if (!cartItems || !totalPrice || !shippingAddress) {
        return res.status(400).json({ message: "Missing required fields" })
      }

      // Generate a unique order ID
      const orderId = uuidv4()

      // スプレッドシートに保存する前の数量処理を修正する関数
      const processOrderItems = (items: CartItem[]) => {
        return items.map((item) => {
          // 特定の販促グッズの場合は、selectedQuantityを数量として使用
          const isSpecialItem = (itemName: string) => {
            // Define your logic to identify special items here
            // For example, check if the item name contains a specific keyword
            return itemName.toLowerCase().includes("special")
          }

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

      const processedItems = processOrderItems(cartItems)

      // Here you would typically save the order details to a database
      // including orderId, processedItems, totalPrice, shippingAddress, and user information from the session.
      // For this example, we'll just log the data.

      console.log("Order ID:", orderId)
      console.log("Processed Items:", processedItems)
      console.log("Total Price:", totalPrice)
      console.log("Shipping Address:", shippingAddress)
      console.log("User Email:", session.user?.email)

      // Respond with success
      res.status(200).json({ message: "Order saved successfully", orderId })
    } catch (error) {
      console.error("Error saving order:", error)
      res.status(500).json({ message: "Failed to save order" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}

export default handler

