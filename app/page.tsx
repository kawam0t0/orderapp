"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  LogOut,
  Search,
  Filter,
  RefreshCw,
  Package,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { format, parseISO, isValid } from "date-fns"
import { ja } from "date-fns/locale"
import { CategoryTabs } from "./category-tabs"
import { CategoryOrders } from "./category-orders"

// 注文アイテムの型定義
type OrderItem = {
  name: string
  size: string
  color: string
  quantity: string
}

// 注文の型定義
type Order = {
  id: number
  orderNumber: string
  orderDate: string
  orderTime: string
  storeName: string
  email: string
  items: OrderItem[]
  status: string
  shippingDate?: string | null
}

// 商品情報の型定義
type AvailableItem = {
  id: string
  category: string
  name: string
  colors?: string[]
  sizes?: string[]
  amounts?: number[]
  prices?: string[]
  pricesPerPiece?: string[]
  leadTime: string
  partnerName?: string
}

// 日付を安全に解析する関数
const safeParseISO = (dateString: string | null | undefined) => {
  if (!dateString) return null
  try {
    const date = parseISO(dateString)
    return isValid(date) ? date : null
  } catch (e) {
    console.error("Invalid date format:", dateString)
    return null
  }
}

// ステータスの選択肢を変更
const STATUS_OPTIONS = ["処理中", "出荷済み"]

// ステータスに応じた色を返す関数
const getStatusColor = (status: string) => {
  switch (status) {
    case "処理中":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "準備中":
      return "bg-amber-100 text-amber-800 hover:bg-amber-100"
    case "手配済み":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    case "配送中":
      return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100"
    case "出荷済み":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "キャンセル":
      return "bg-red-100 text-red-800 hover:bg-red-100"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [selectedDates, setSelectedDates] = useState<{ [key: string]: Date | undefined }>({})
  const [activeCategory, setActiveCategory] = useState<string>("販促グッズ") // デフォルトを販促グッズに変更
  const categories = ["販促グッズ", "液剤"] // カテゴリーを2つに制限
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]) // 商品データを保持するstate

  // 商品データを取得する関数
  const fetchAvailableItems = async () => {
    try {
      const response = await fetch("/api/sheets?sheet=Available_items")
      if (response.ok) {
        const data = await response.json()
        setAvailableItems(data)
      } else {
        console.error("Failed to fetch available items")
      }
    } catch (error) {
      console.error("Error fetching available items:", error)
    }
  }

  // 注文データを取得する関数
  const fetchOrders = async (page = 1, search = searchQuery) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin-orders?page=${page}&limit=30&search=${search}`)
      const data = await response.json()

      if (response.ok) {
        // 出荷日の初期化
        const ordersWithDates = data.orders.map((order: Order) => {
          // 出荷日がある場合はDateオブジェクトに変換
          if (order.shippingDate) {
            try {
              const dateObj = parseISO(order.shippingDate)
              if (isValid(dateObj)) {
                setSelectedDates((prev) => ({
                  ...prev,
                  [order.orderNumber]: dateObj,
                }))
              }
            } catch (e) {
              console.error("Invalid date format:", order.shippingDate)
            }
          }
          return order
        })

        setOrders(ordersWithDates)
        setTotalPages(data.totalPages)
        setTotalOrders(data.total)
        setCurrentPage(data.page)
      } else {
        console.error("Failed to fetch orders:", data.error)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // 初回レンダリング時にデータを取得
  useEffect(() => {
    fetchAvailableItems() // 商品データを取得
    fetchOrders()
  }, [])

  // カテゴリーに基づいて商品をフィルタリングする関数
  const getCategoryItems = (order: Order, category: string): OrderItem[] => {
    return order.items.filter((item) => {
      // 商品名を取得
      const itemName = item.name

      // Available_itemsシートから該当する商品を検索
      const matchingItem = availableItems.find((avItem) => itemName.includes(avItem.name))

      // 該当する商品が見つかり、そのカテゴリーが指定されたカテゴリーと一致する場合
      if (matchingItem && matchingItem.category === category) {
        return true
      }

      return false
    })
  }

  // 検索処理
  const handleSearch = () => {
    fetchOrders(1, searchQuery)
  }

  // ページ変更処理
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchOrders(newPage)
    }
  }

  // handleStatusChange関数の修正
  const handleStatusChange = async (orderNumber: string, newStatus: string) => {
    setIsUpdating(orderNumber)
    try {
      const response = await fetch("/api/update-order-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderNumber, newStatus }),
      })

      if (response.ok) {
        setOrders((prevOrders) =>
          prevOrders.map((order) => (order.orderNumber === orderNumber ? { ...order, status: newStatus } : order)),
        )
      } else {
        const data = await response.json()
        console.error("Failed to update status:", data.error)
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setIsUpdating(null)
    }
  }

  // 出荷日の更新処理を修正
  // 出荷日の更新処理を修正
  const handleShippingDateChange = async (orderNumber: string, date: Date | undefined) => {
    try {
      // 出荷日が設定されていない場合は「処理中」にする
      if (!date) {
        await fetch("/api/update-order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderNumber,
            newStatus: "処理中",
          }),
        })

        setOrders((prevOrders) =>
          prevOrders.map((order) => {
            if (order.orderNumber === orderNumber) {
              return {
                ...order,
                shippingDate: null,
                status: "処理中",
              }
            }
            return order
          }),
        )
        return
      }

      // 現在の注文情報を取得
      const currentOrder = orders.find((order) => order.orderNumber === orderNumber)
      const isStatusChanging = currentOrder?.status === "処理中"

      // 出荷日を更新
      const response = await fetch("/api/update-shipping-date", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderNumber,
          shippingDate: date ? format(date, "yyyy-MM-dd") : null,
        }),
      })

      if (response.ok) {
        // 成功したら注文リストを更新
        setOrders((prevOrders) =>
          prevOrders.map((order) => {
            if (order.orderNumber === orderNumber) {
              return {
                ...order,
                shippingDate: format(date, "yyyy-MM-dd"),
                status: "出荷済み",
              }
            }
            return order
          }),
        )

        // ステータスも更新
        await fetch("/api/update-order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderNumber,
            newStatus: "出荷済み",
          }),
        })

        // 選択された日付を保持
        setSelectedDates((prev) => ({
          ...prev,
          [orderNumber]: date,
        }))

        // ステータスが「処理中」から「出荷済み」に変わった場合のみ通知メールを送信
        if (isStatusChanging && currentOrder) {
          try {
            // baseUrlの取得方法を修正
            const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
              ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
              : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

            console.log("Using base URL for shipping notification:", baseUrl)

            await fetch(`${baseUrl}/api/send-shipping-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: currentOrder.email,
                orderNumber: currentOrder.orderNumber,
                storeName: currentOrder.storeName,
                shippingDate: format(date, "yyyy-MM-dd"),
                items: currentOrder.items, // 商品情報を追加
              }),
            })
            console.log(`出荷通知メールを送信しました: ${currentOrder.orderNumber}`)
          } catch (emailError) {
            console.error("出荷通知メール送信エラー:", emailError)
          }
        }
      } else {
        const data = await response.json()
        console.error("Failed to update shipping date:", data.error)
      }
    } catch (error) {
      console.error("Error updating shipping date:", error)
    }
  }

  // ログアウト処理
  const handleLogout = () => {
    router.push("/login")
  }

  // 日付をフォーマットする関数
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

  // フィルタリングされた注文リスト
  const filteredOrders = statusFilter ? orders.filter((order) => order.status === statusFilter) : orders

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-10 bg-gray-100 text-gray-800 shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Package className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-bold tracking-tight">SPLASH'N'GO! 管理者ダッシュボード</h1>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-gray-700 hover:bg-gray-200">
                    <span className="hidden md:inline">管理者</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>管理者メニュー</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8 border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold text-gray-800">発注履歴管理</CardTitle>
            <CardDescription className="text-gray-500">
              全店舗の発注履歴を管理し、ステータスや出荷日を更新できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="発注番号または店舗名で検索..."
                  className="pl-10 bg-gray-50 border-gray-200 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  className="flex items-center bg-white hover:bg-gray-50"
                  onClick={handleSearch}
                >
                  <Search className="mr-2 h-4 w-4" />
                  検索
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={`flex items-center bg-white hover:bg-gray-50 ${statusFilter ? "border-blue-500 text-blue-600" : ""}`}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      {statusFilter || "すべてのステータス"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setStatusFilter(null)}>すべて表示</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  className="flex items-center bg-white hover:bg-gray-50"
                  onClick={() => fetchOrders(currentPage)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  更新
                </Button>
                <Button variant="outline" className="flex items-center bg-white hover:bg-gray-50">
                  <Download className="mr-2 h-4 w-4" />
                  CSVエクスポート
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden bg-white">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">注文データがありません</p>
              <p className="text-gray-400 text-sm mt-2">検索条件を変更するか、新しい注文を待ちましょう</p>
            </div>
          ) : (
            <>
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />

              {/* カテゴリー別表示 */}
              <CategoryOrders
                orders={filteredOrders}
                category={activeCategory}
                onDateSelect={handleShippingDateChange}
                formatDateTime={formatDateTime}
                getStatusColor={getStatusColor}
                selectedDates={selectedDates}
                availableItems={availableItems}
              />

              {/* ページネーション */}
              <div className="flex items-center justify-between px-6 py-5 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  全 {totalOrders} 件中 {(currentPage - 1) * 30 + 1} - {Math.min(currentPage * 30, totalOrders)}{" "}
                  件を表示
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="bg-white hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum =
                        currentPage <= 3
                          ? i + 1
                          : currentPage >= totalPages - 2
                            ? totalPages - 4 + i
                            : currentPage - 2 + i

                      if (pageNum <= 0 || pageNum > totalPages) return null

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={
                            currentPage === pageNum
                              ? "bg-[#FFD814] hover:bg-[#F7CA00] text-black border-[#FCD200]"
                              : "bg-white hover:bg-gray-50"
                          }
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="bg-white hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </main>

      <footer className="bg-gray-800 text-white py-5 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Package className="h-5 w-5 text-blue-400 mr-2" />
              <span className="font-semibold">SPLASH'N'GO! 管理システム</span>
            </div>
            <div className="text-gray-400 text-sm">
              <p>&copy; 2025 SPLASH'N'GO! All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

