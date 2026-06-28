"use client"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface AnimatedStatCardProps {
  label: string
  value: number
  sublabel?: string
  icon: React.ReactNode
  color: string
  delay?: number
}

function useCountUp(target: number, duration = 800) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    const start = performance.now()
    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return current
}

export function AnimatedStatCard({ label, value, sublabel, icon, color, delay = 0 }: AnimatedStatCardProps) {
  const displayed = useCountUp(value, 800)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-zinc-100 p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{displayed}</p>
          {sublabel && <p className="text-xs text-zinc-400 mt-0.5">{sublabel}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}
