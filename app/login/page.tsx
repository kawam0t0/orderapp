"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

// 静的ページ生成を無効化し、動的レンダリングを強制
export const dynamic = "force-dynamic"

export default function LoginPage() {
  const router = useRouter()
  const [storeId, setStoreId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!storeId.trim()) {
      setError("店舗IDを入力してください")
      return
    }

    setLoading(true)
    setError("")

    try {
      // クライアントサイドでのみAPIを呼び出す
      const response = await fetch(`/api/sheets?sheet=store_info!A2:G`)

      if (!response.ok) {
        throw new Error("店舗情報の取得に失敗しました")
      }

      const data = await response.json()

      // 店舗IDが一致するデータを検索
      const storeData = data.find((store: any[]) => store[0] === storeId)

      if (storeData) {
        // 店舗情報をローカルストレージに保存
        const storeInfo = {
          id: storeData[0],
          name: storeData[1],
          email: storeData[5],
        }

        localStorage.setItem("storeInfo", JSON.stringify(storeInfo))

        // 商品一覧ページにリダイレクト
        router.push("/products")
      } else {
        setError("入力された店舗IDは登録されていません")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン処理中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-blue-100">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/placeholder.svg?height=80&width=240"
              alt="SPLASH'N'GO! Logo"
              width={240}
              height={80}
              className="rounded"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-800">SPLASH'N'GO!</CardTitle>
          <CardDescription className="text-blue-600">備品発注システム</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="storeId">店舗ID</Label>
              <Input
                id="storeId"
                placeholder="店舗IDを入力してください"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>

            {error && (
              <Alert className="mt-4 bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="w-full text-sm text-gray-500 bg-blue-50 p-3 rounded-md flex items-start">
            <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
            <p>
              店舗IDがわからない場合は、管理者にお問い合わせください。
              <br />
              <a href="mailto:info@splashbrothers.co.jp" className="text-blue-600 hover:underline">
                info@splashbrothers.co.jp
              </a>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

