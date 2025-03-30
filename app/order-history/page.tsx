"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ja } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Package, ShoppingCart, Calendar, Clock, Tag, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type OrderItem = {
  name: string
  size: string
  color: string
  quantity: string
}

type Order = {
  orderNumber: string
  orderDate: string
  orderTime: string
  items: OrderItem[]
  status: string
  shippingDate?: string
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

export default function OrderHistoryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/sheets?sheet=Order_history")
        if (response.ok) {
          const data = await response.json()
          console.log("Fetched order data:", data) // デバッグ用

          // 日付でソートする（降順 - 最新のものが上に来るように）
          const sortedOrders = [...data].sort((a, b) => {
            // 日付と時間を結合して比較
            const dateA = new Date(`${a.orderDate} ${a.orderTime}`)
            const dateB = new Date(`${b.orderDate} ${b.orderTime}`)
            return dateB.getTime() - dateA.getTime() // 降順
          })

          setOrders(sortedOrders)
        } else {
          console.error("Failed to fetch orders")
        }
      } catch (error) {
        console.error("Error fetching orders:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      // 日付と時間を解析
      const [year, month, day] = dateStr.split("/").map(Number)
      const [hour, minute] = timeStr.split(":").map(Number)

      const date = new Date(year, month - 1, day, hour, minute)

      // 日付をフォーマット
      return format(date, "yyyy年MM月dd日(EEE) HH:mm", { locale: ja })
    } catch (e) {
      return `${dateStr} ${timeStr}`
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "処理中":
        return "bg-blue-100 text-blue-800"
      case "出荷済み":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string, shippingDate?: string) => {
    if (status === "出荷済み" && shippingDate) {
      try {
        const date = parseISO(shippingDate)
        return `${status} (${format(date, "yyyy/MM/dd")})`
      } catch (e) {
        return `${status} (${shippingDate})`
      }
    }
    return status
  }

  // 数量の表示方法を修正する関数
  const formatQuantity = (item: OrderItem) => {
    // 特定のアイテムの場合は、数量のみを表示（「枚」を付ける）
    if (isSpecialItem(item.name)) {
      return `${item.quantity}枚`
    }

    // その他の商品は数量をそのまま表示
    return item.quantity
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ヘッダー - 他の画面と同じグラデーションデザイン */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight flex items-center">
                <Package className="h-6 w-6 mr-2" />
                発注履歴
                <span className="text-blue-200 ml-2 text-lg font-normal">
                  {orders.length > 0 ? `(${orders.length}件)` : ""}
                </span>
              </h1>
              <p className="text-blue-200 text-sm mt-1">過去の発注内容を確認できます</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 h-10 backdrop-blur-sm transition-all duration-200 hover:scale-105"
                onClick={() => router.push("/products")}
              >
                <Tag className="h-5 w-5 mr-2" />
                <span className="text-sm">商品一覧</span>
              </Button>
              <Button
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 h-10 backdrop-blur-sm transition-all duration-200 hover:scale-105"
                onClick={() => {
                  localStorage.removeItem("cart")
                  router.push("/login")
                }}
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span className="text-sm">ログアウト</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* 上部のナビゲーション */}
        <div className="mb-8 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => router.push("/products")}
            className="flex items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            商品一覧に戻る
          </Button>

          <div className="text-sm text-gray-500">
            {orders.length > 0 ? `${orders.length}件の発注履歴があります` : ""}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-lg shadow-sm p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">発注履歴を読み込み中...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">発注履歴がありません</h2>
            <p className="text-gray-500 mb-6">まだ発注履歴がありません。商品を注文してみましょう。</p>
            <Button onClick={() => router.push("/products")} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
              商品を見る
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card
                key={order.orderNumber}
                className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <CardTitle className="text-lg font-medium flex items-center text-blue-800">
                      <Tag className="h-4 w-4 mr-2 text-blue-600" />
                      発注番号: {order.orderNumber}
                    </CardTitle>
                    <div className="flex items-center mt-2 md:mt-0 space-x-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1 text-blue-500" />
                        <span>{order.orderDate}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1 text-blue-500" />
                        <span>{order.orderTime}</span>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} ml-2`}>
                        {getStatusText(order.status, order.shippingDate)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-y border-gray-200">
                          <th className="px-4 py-3 text-left font-medium text-gray-600">商品名</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-600">サイズ</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-600">カラー</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-600">数量</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, index) => (
                            <tr key={index} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-4 text-gray-800 font-medium">{item.name}</td>
                              <td className="px-4 py-4 text-center text-gray-600">{item.size || "-"}</td>
                              <td className="px-4 py-4 text-center text-gray-600">{item.color || "-"}</td>
                              <td className="px-4 py-4 text-center text-gray-600 font-medium">
                                {formatQuantity(item)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <Package className="h-8 w-8 text-gray-300 mb-2" />
                                商品情報がありません
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 注文の詳細情報フッター */}
                  {order.items && order.items.length > 0 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">合計アイテム数:</span> {order.items.length}点
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 font-medium">ステータス:</span>{" "}
                          <Badge className={`${getStatusColor(order.status)} ml-1`}>
                            {getStatusText(order.status, order.shippingDate)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* フッター - 他の画面と同じデザイン */}
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Package className="h-5 w-5 text-blue-400 mr-2" />
              <span className="font-semibold">SPLASH'N'GO! 発注システム</span>
            </div>
            <div className="text-gray-400 text-sm">
              <p>&copy; 2025 SPLASH'N'GO!Item Store. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

