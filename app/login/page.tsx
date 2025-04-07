"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, User, Lock, Store, Eye, EyeOff } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 静的ページ生成を無効化し、動的レンダリングを強制
export const dynamic = "force-dynamic"

// 店舗情報の型定義
type StoreInfo = {
  id: string
  name: string
  email: string
  password?: string
}

export default function LoginPage() {
  const router = useRouter()
  const [selectedStore, setSelectedStore] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [showPassword, setShowPassword] = useState(false)

  // 店舗情報を取得
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch(`/api/sheets?sheet=store_info!A2:G`)
        if (!response.ok) {
          throw new Error("店舗情報の取得に失敗しました")
        }

        const data = await response.json()

        // 店舗データを整形
        const storeList = data
          .map((store: any[]) => ({
            id: store[0] || "",
            name: store[1] || "",
            email: store[5] || "",
            password: store[6] || "", // パスワードカラムを追加
          }))
          .filter((store: StoreInfo) => store.id && store.name) // 有効なデータのみ

        setStores(storeList)
      } catch (err) {
        console.error("店舗情報取得エラー:", err)
        setError("店舗情報の取得に失敗しました")
      }
    }

    fetchStores()
  }, [])

  // 店舗選択時の処理
  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId)

    // 選択された店舗のメールアドレスを自動入力
    const selectedStoreData = stores.find((store) => store.id === storeId)
    if (selectedStoreData && selectedStoreData.email) {
      setEmail(selectedStoreData.email)
    }
  }

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStore) {
      setError("店舗を選択してください")
      return
    }

    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください")
      return
    }

    setLoading(true)
    setError("")

    try {
      // 選択された店舗とメール・パスワードが一致するか確認
      const storeData = stores.find(
        (store) => store.id === selectedStore && store.email === email && store.password === password,
      )

      if (storeData) {
        // 店舗情報をローカルストレージに保存
        const storeInfo = {
          id: storeData.id,
          name: storeData.name,
          email: storeData.email,
        }

        localStorage.setItem("storeInfo", JSON.stringify(storeInfo))

        // 商品一覧ページにリダイレクト
        router.push("/products")
      } else {
        setError("メールアドレスまたはパスワードが正しくありません")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン処理中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // 管理者ログイン処理
  const handleAdminLogin = () => {
    router.push("/admin")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-blue-100">
        <CardHeader className="space-y-1 text-center bg-blue-600 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold tracking-tight">SPLASH'N'GO!</CardTitle>
          <CardDescription className="text-blue-100 text-lg">備品発注システム</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <p className="text-center text-gray-600">メールアドレスとパスワードを入力してログインしてください</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store" className="flex items-center text-gray-700">
                <Store className="h-4 w-4 mr-2 text-blue-600" />
                店舗名
              </Label>
              <Select value={selectedStore} onValueChange={handleStoreChange}>
                <SelectTrigger className="border-blue-200 focus:border-blue-400">
                  <SelectValue placeholder="店舗を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center text-gray-700">
                <User className="h-4 w-4 mr-2 text-blue-600" />
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center text-gray-700">
                <Lock className="h-4 w-4 mr-2 text-blue-600" />
                パスワード
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-blue-200 focus:border-blue-400 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          {/* 管理者ログインボタン */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={handleAdminLogin}
            >
              管理者ログイン
            </Button>
          </div>
        </CardContent>

        <CardFooter>
          <div className="w-full text-sm text-gray-500 bg-blue-50 p-3 rounded-md flex items-start">
            <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
            <p>
              ログイン情報がわからない場合は、管理者にお問い合わせください。
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

