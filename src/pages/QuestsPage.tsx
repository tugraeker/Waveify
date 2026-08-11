import { QuestTree, TimeCapsule, Titles } from '@/pages/Quests'

export default function QuestPage() {
  return (
    <div className="p-8 overflow-y-auto h-full scrollbar-thin animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Görevler & Ünvanlar</h1>
        <p className="text-sm text-surface-500 mt-1">Ağacını büyüt, kapsülünü göm, ünvanını kazan</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        <QuestTree />
        <div className="flex flex-col gap-4">
          <TimeCapsule />
          <Titles />
        </div>
      </div>
    </div>
  )
}
