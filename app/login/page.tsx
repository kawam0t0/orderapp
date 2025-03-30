import { Suspense } from "react"
import Image from "next/image"
import LoginForm from "./LoginForm"
import { getStores } from "@/lib/api"

export default async function LoginPage() {
  const stores = await getStores()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-5 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center">
            <p className="text-blue-100 text-sm font-light tracking-wide">オリジナルグッズ・備品発注システム</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-4 flex justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E5%90%8D%E7%A7%B0%E6%9C%AA%E8%A8%AD%E5%AE%9A%E3%81%AE%E3%83%86%E3%82%99%E3%82%B5%E3%82%99%E3%82%A4%E3%83%B3%20%281%29-A6SNkbmxHy2XzD0kFQLijaumpsCokz.png"
              alt="SPLASH'N'GO! ロゴ"
              width={180}
              height={180}
              className="h-auto w-auto drop-shadow-md"
              priority
            />
          </div>

          <Suspense
            fallback={
              <div className="w-full h-96 bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 animate-pulse flex items-center justify-center">
                <div className="text-gray-400">ログインフォームを読み込み中...</div>
              </div>
            }
          >
            <LoginForm initialStores={stores} />
          </Suspense>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-gray-400 py-3 text-center text-xs">
        <p>© 2024 SPLASH'N'GO! All rights reserved.</p>
      </footer>
    </div>
  )
}

