import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass, MessageCircle, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Compass,
    title: '排盘精准',
    desc: '真太阳时校正，节气定月柱，1900年至今无误差',
  },
  {
    icon: Sparkles,
    title: 'AI 解读',
    desc: '旺衰、格局、用神、调候，多维引擎 + 大模型翻译',
  },
  {
    icon: MessageCircle,
    title: '对话命理师',
    desc: '流式对话，上下文记忆，犹如真人命理师当面指点',
  },
];

const navCards = [
  { href: '/chart', title: '排盘', desc: '输入你的出生时间，生成专属八字命盘和AI分析报告' },
  { href: '/chat', title: '聊天', desc: '和AI命理师对话，问任何关于你命运的问题' },
  { href: '/compare', title: '合盘', desc: '输入两个人的生日，分析感情和缘分匹配度' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center px-4">
      {/* Hero */}
      <div className="max-w-2xl space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          AI Destiny OS
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed max-w-lg mx-auto">
          基于千年命理算法的八字分析引擎，结合大语言模型，
          <br />
          为你解读命运的密码
        </p>

        {/* CTA */}
        <div className="pt-4">
          <Link href="/chart">
            <Button size="lg" className="h-12 px-8 text-base cursor-pointer">
              开始分析命盘
            </Button>
          </Link>
        </div>
      </div>

      {/* Nav cards — three clickable links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mt-16 w-full">
        {navCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-destiny-700 hover:bg-destiny-950/20 transition-all group"
          >
            <h3 className="font-semibold text-sm text-zinc-200 group-hover:text-destiny-400 transition-colors">
              {card.title}
            </h3>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              {card.desc}
            </p>
          </Link>
        ))}
      </div>

      {/* Newbie hint */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
        <span>新手？</span>
        <Link href="/chart" className="text-destiny-400 hover:text-destiny-300 underline underline-offset-2">
          从排盘开始
        </Link>
        <span>&larr;</span>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mt-20 w-full">
        {features.map((f) => (
          <div key={f.title} className="flex flex-col items-center gap-3 px-4 py-5 rounded-xl border border-zinc-800/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 ring-1 ring-zinc-700">
              <f.icon className="h-5 w-5 text-zinc-300" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-200">{f.title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-zinc-600">
        AI 命理分析仅供参考，不构成人生决策依据
      </p>
    </div>
  );
}
