"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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

export function CategoryOrders({
  orders,
  category,
  onDateSelect,
  formatDateTime,
  getStatusColor,
  selectedDates,
  availableItems,
  getPromotionalItems,
}) {
  const [expandedOrders, setExpandedOrders] = useState<{ [key: string]: boolean }>({})

  // 注文の展開/折りたたみを切り替える
  const toggleOrderExpand = (orderNumber: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderNumber]: !prev[orderNumber],
    }))
  }

  // 数量の表示方法を修正する関数
  const formatQuantity = (item) => {
    // 特定のアイテムの場合は、数量を「XX枚」として表示
    if (isSpecialItem(item.name)) {
      return `${item.quantity}枚`
    }

    // その他の商品は数量をそのまま表示
    return item.quantity
  }

  // 日付でソートされた注文を取得
  const sortedOrders = [...orders].sort((a, b) => {
    // 日付と時間を解析
    const parseDateTime = (dateStr: string, timeStr: string) => {
      try {
        const [year, month, day] = dateStr.split("/").map(Number)
        const [hour, minute] = timeStr.split(":").map(Number)
        return new Date(year, month - 1, day, hour, minute).getTime()
      } catch (e) {
        return 0
      }
    }

    const dateTimeA = parseDateTime(a.orderDate, a.orderTime)
    const dateTimeB = parseDateTime(b.orderDate, b.orderTime)

    return dateTimeB - dateTimeA // 降順（最新が先頭）
  })

  return (
    <div className="divide-y divide-gray-100">
      {sortedOrders.map((order) => {
        // 販促グッズのアイテムをフィルタリング
        const promotionalItems = getPromotionalItems(order)

        // 販促グッズのアイテムがない場合はスキップ
        if (promotionalItems.length === 0) return null

        const isExpanded = expandedOrders[order.orderNumber] || false

        return (
          <div key={order.orderNumber} className="py-4 px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{order.storeName}</h3>
                  <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  発注番号: {order.orderNumber} | 発注日時: {formatDateTime(order.orderDate, order.orderTime)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal bg-white",
                        !selectedDates[order.orderNumber] && "text-gray-500",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDates[order.orderNumber]
                        ? format(selectedDates[order.orderNumber], "yyyy年MM月dd日", { locale: ja })
                        : "出荷日を選択"}
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleOrderExpand(order.orderNumber)}
                  className="text-blue-600"
                >
                  {isExpanded ? "折りたたむ" : "詳細を表示"}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">注文商品一覧</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          商品名
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          サイズ
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          カラー
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          数量
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {promotionalItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.size || "-"}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.color || "-"}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatQuantity(item)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

