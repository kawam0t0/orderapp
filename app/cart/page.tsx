"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Trash2, ArrowLeft, ShoppingBag } from "lucide-react"
import { format, addWeeks } from "date-fns"
import { ja } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

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

// アパレル商品かどうかを判定する関数
const isApparelItem = (name: string): boolean => {
  const apparelItems = ["Tシャツ", "フーディ", "ワークシャツ", "つなぎ"]
  return apparelItems.some((item) => name.includes(item))
}

// 数量の表示方法を修正する関数
const formatQuantity = (item) => {
  // 特定の販促グッズの場合は、数量をそのまま表示
  if (specialPromotionalItems.some((name) => item.item_name.includes(name))) {
    return `${item.quantity}枚`
  }

  // その他の商品は従来通りの処理
  return `${item.quantity}${item.item_name.includes("液剤") ? "本" : "枚"}`
}

// 商品タイプの定義
type CartItem = {
  id: string
  item_category: string
  item_name: string
  item_color?: string[]
  item_size?: string[]
  item_amount?: number | number[]
  item_price: string | string[]
  lead_time: string
  selectedColor?: string
  selectedSize?: string
  selectedQuantity?: number | string
  quantity: number
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // カート情報の取得
  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart)
        setCartItems(items)
      } catch (e) {
        console.error("Failed to parse cart data:", e)
      }
    }
  }, [])

  // 商品の削除
  const removeItem = (itemId: string) => {
    const updatedCart = cartItems.filter((item) => item.id !== itemId)
    setCartItems(updatedCart)
    localStorage.setItem("cart", JSON.stringify(updatedCart))
  }

  // 商品価格の計算
  const calculateItemPrice = (item: CartItem) => {
    // アパレル商品の場合
    if (isApparelItem(item.item_name)) {
      const basePrice = Number(String(item.item_price).replace(/[^0-9.-]+/g, ""))
      return basePrice * item.quantity
    }
    // 販促グッズの場合
    else if (item.item_category === "販促グッズ" && item.selectedQuantity) {
      const price = Number(String(item.item_price).replace(/[^0-9.-]+/g, ""))
      return price // 販促グッズは選択した数量セットの価格をそのまま使用
    }
    // その他の商品の場合
    else {
      const basePrice = Number(String(item.item_price).replace(/[^0-9.-]+/g, ""))
      return basePrice * item.quantity
    }
  }

  // 小計の計算
  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + calculateItemPrice(item)
    }, 0)
  }

  // 税金の計算（10%）
  const calculateTax = () => {
    return calculateSubtotal() * 0.1
  }

  // 合計金額の計算
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  // 商品画像の取得
  const getProductImage = (category: string, name: string) => {
    // カテゴリーに基づいたプレースホルダー画像を返す
    switch (category) {
      case "アパレル":
        return `/placeholder.svg?height=300&width=300&text=👕%20${encodeURIComponent(name)}`
      case "販促グッズ":
        return `/placeholder.svg?height=300&width=300&text=🎁%20${encodeURIComponent(name)}`
      case "液剤":
        return `/placeholder.svg?height=300&width=300&text=💧%20${encodeURIComponent(name)}`
      case "クロス":
        return `/placeholder.svg?height=300&width=300&text=🧹%20${encodeURIComponent(name)}`
      default:
        return `/placeholder.svg?height=300&width=300&text=${encodeURIComponent(category)}%0A${encodeURIComponent(name)}`
    }
  }

  // 注文処理
  const handleCheckout = () => {
    router.push("/checkout")
  }

  // 納期の表示
  const displayDeliveryTime = (leadTime: string | undefined) => {
    // leadTimeがundefinedまたはnullの場合、デフォルト値を返す
    if (!leadTime) return "納期未定"

    // "即日"の場合はそのまま返す
    if (leadTime === "即日") return "即日出荷"

    // X週間の形式から数値を抽出
    const weeks = Number(leadTime.match(/\d+/)?.[0] || "0")

    // 現在日付からX週間後の日付を計算
    const deliveryDate = addWeeks(new Date(), weeks)

    // フォーマット: ○○月○○日頃
    return format(deliveryDate, "M月d日頃", { locale: ja })
  }

  // 特定のアイテムかどうかを判定する関数
  const isSpecialItem = (itemName: string): boolean => {
    return specialPromotionalItems.some((name) => itemName.includes(name))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">ショッピングカート</h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6 flex items-center" onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          買い物を続ける
        </Button>

        {cartItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="text-5xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-2">カートは空です</h3>
            <p className="text-gray-500 mb-6">商品を追加してください</p>
            <Button onClick={() => router.push("/products")} className="px-6">
              商品一覧に戻る
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カート商品リスト */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">カート内の商品 ({cartItems.length}点)</h2>

                  {cartItems.map((item) => (
                    <div key={item.id} className="mb-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative h-24 w-24 bg-gray-100 rounded-md flex-shrink-0">
                          <Image
                            src={getProductImage(item.item_category, item.item_name) || "/placeholder.svg"}
                            alt={item.item_name}
                            fill
                            className="object-contain p-2"
                          />
                          <Badge className="absolute -top-2 -right-2 bg-blue-600 text-xs">{item.item_category}</Badge>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{item.item_name}</h3>
                            <p className="font-semibold">¥{calculateItemPrice(item).toLocaleString()}</p>
                          </div>

                          {/* 詳細情報（カラー、サイズなど） */}
                          <div className="text-sm text-gray-500 mb-2">
                            {item.selectedColor && <span className="mr-2">カラー: {item.selectedColor}</span>}
                            {item.selectedSize && <span className="mr-2">サイズ: {item.selectedSize}</span>}

                            {/* 特定のアイテムの場合は、selectedQuantityを「XX枚」として表示 */}
                            {isSpecialItem(item.item_name) && item.selectedQuantity && (
                              <span className="mr-2">{item.selectedQuantity}枚</span>
                            )}

                            {/* 特定のアイテム以外の販促グッズの場合 */}
                            {!isSpecialItem(item.item_name) &&
                              item.item_category === "販促グッズ" &&
                              item.selectedQuantity && <span className="mr-2">{item.selectedQuantity}個</span>}

                            <span className="text-green-600">納期: {displayDeliveryTime(item.lead_time)}</span>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            {/* 特定のアイテム以外の場合のみ数量を表示 */}
                            {!isSpecialItem(item.item_name) && (
                              <div className="text-sm text-gray-600">数量: {formatQuantity(item)}</div>
                            )}

                            {/* 削除ボタン */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* 注文サマリー */}
            <div>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">注文サマリー</h2>

                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">小計</span>
                      <span>¥{calculateSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">消費税 (10%)</span>
                      <span>¥{calculateTax().toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>合計</span>
                      <span>¥{calculateTotal().toLocaleString()}</span>
                    </div>

                    <Button
                      className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                    >
                      {isCheckingOut ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          処理中...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <ShoppingBag className="mr-2 h-5 w-5" />
                          注文を確認する
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-400">
            <p>&copy; SPLASH'N'GO!Item Store. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

