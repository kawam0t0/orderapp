"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CategoryTabsProps {
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="px-6 pt-4 border-b border-gray-100">
      <Tabs value={activeCategory} onValueChange={onCategoryChange}>
        <TabsList className="bg-gray-50 p-1">
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className={`px-4 py-2 ${
                activeCategory === category
                  ? "bg-white shadow-sm text-blue-600 font-medium"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

