"use client"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

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

interface CategoryOrdersProps {
  orders: Order[]
  category: string
  onDateSelect: (orderNumber: string, date: Date | undefined) => void
  formatDateTime: (dateStr: string, timeStr: string) => string
  getStatusColor: (status: string) => string
  selectedDates: { [key: string]: Date | undefined }
  availableItems: AvailableItem[]
}

export function CategoryOrders({
  orders,
  category,
  onDateSelect,
  formatDateTime,
  getStatusColor,
  selectedDates,
  availableItems,
}: CategoryOrdersProps) {
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

  return (
    <div className="divide-y divide-gray-100">
      {orders.map((order) => {
        // 選択されたカテゴリーに属する商品のみをフィルタリング
        const categoryItems = getCategoryItems(order, category)

        // 該当する商品がない場合は表示しない
        if (categoryItems.length === 0) return null

        return (
          <div key={order.orderNumber} className="p-6 hover:bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">発注番号: {order.orderNumber}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">{formatDateTime(order.orderDate, order.orderTime)}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">店舗名: {order.storeName}</p>
              </div>

              <div className="mt-4 md:mt-0 flex items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`flex items-center h-9 px-3 ${
                        selectedDates[order.orderNumber] ? "border-blue-500 text-blue-600" : ""
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDates[order.orderNumber]
                        ? format(selectedDates[order.orderNumber]!, "yyyy年MM月dd日", { locale: ja })
                        : "出荷日を設定"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDates[order.orderNumber]}
                      onSelect={(date) => onDateSelect(order.orderNumber, date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      商品名
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      サイズ
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      カラー
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      数量
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryItems.map((item, index) => (
                    <tr key={`${order.orderNumber}-${index}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                        {item.size || "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                        {item.color || "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

