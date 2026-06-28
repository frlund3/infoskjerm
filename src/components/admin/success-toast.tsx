"use client"
import { motion } from "framer-motion"

export function SuccessToast({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="20" height="20" viewBox="0 0 20 20">
        <motion.path
          d="M4 10 L8 14 L16 6"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
