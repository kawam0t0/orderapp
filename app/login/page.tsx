"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Store, User, Lock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [storeId, setStoreId] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedStore, setSelectedStore] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [activeTab, setActiveTab] = useState("store")

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

  // 店舗IDでのログイン処理
  const handleStoreIdLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!storeId.trim()) {
      setError("店舗IDを入力してください")
      return
    }

    setLoading(true)
    setError("")

    try {
      // 店舗IDが一致するデータを検索
      const storeData = stores.find((store) => store.id === storeId)

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
        setError("入力された店舗IDは登録されていません")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン処理中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // メール・パスワードでのログイン処理
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください")
      return
    }

    setLoading(true)
    setError("")

    try {
      // メールとパスワードが一致するデータを検索
      const storeData = stores.find((store) => store.email === email && store.password === password)

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

  // 店舗名選択でのログイン処理
  const handleStoreNameLogin = async () => {
    if (!selectedStore) {
      setError("店舗を選択してください")
      return
    }

    setLoading(true)
    setError("")

    try {
      // 選択された店舗IDに一致するデータを検索
      const storeData = stores.find((store) => store.id === selectedStore)

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
        setError("選択された店舗情報が見つかりません")
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
          <Tabs defaultValue="store" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4 w-full bg-blue-50">
              <TabsTrigger value="store" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                店舗ID
              </TabsTrigger>
              <TabsTrigger value="email" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                メール
              </TabsTrigger>
              <TabsTrigger value="select" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                店舗選択
              </TabsTrigger>
            </TabsList>

            {/* 店舗IDでのログイン */}
            <TabsContent value="store">
              <form onSubmit={handleStoreIdLogin}>
                <div className="space-y-2">
                  <Label htmlFor="storeId" className="flex items-center">
                    <Store className="h-4 w-4 mr-2" />
                    店舗ID
                  </Label>
                  <Input
                    id="storeId"
                    placeholder="店舗IDを入力してください"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>

                <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? "ログイン中..." : "ログイン"}
                </Button>
              </form>
            </TabsContent>

            {/* メール・パスワードでのログイン */}
            <TabsContent value="email">
              <form onSubmit={handleEmailLogin}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      メールアドレス
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="メールアドレスを入力してください"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      パスワード
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="パスワードを入力してください"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? "ログイン中..." : "ログイン"}
                </Button>
              </form>
            </TabsContent>

            {/* 店舗選択でのログイン */}
            <TabsContent value="select">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName" className="flex items-center">
                    <Store className="h-4 w-4 mr-2" />
                    店舗を選択
                  </Label>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
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

                <Button
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                  disabled={loading || !selectedStore}
                  onClick={handleStoreNameLogin}
                >
                  {loading ? "ログイン中..." : "ログイン"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4 bg-red-50 border-red-200 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 管理者ログインボタン */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={handleAdminLogin}
            >
              管理者としてログイン
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

