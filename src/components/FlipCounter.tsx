'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipDigitProps {
  digit: string;
  delay?: number;
}

// 单个数字的翻牌动画
function FlipDigit({ digit, delay = 0 }: FlipDigitProps) {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);
  const prevDigit = useRef(digit);

  useEffect(() => {
    if (digit !== prevDigit.current) {
      setIsFlipping(true);
      
      // 翻牌动画完成后更新数字
      const timer = setTimeout(() => {
        setCurrentDigit(digit);
        prevDigit.current = digit;
        setIsFlipping(false);
      }, 300 + delay);

      return () => clearTimeout(timer);
    }
  }, [digit, delay]);

  return (
    <div className="relative w-[0.65em] h-[1.2em] overflow-hidden">
      {/* 背景卡片 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-white/[0.03] rounded-md border border-white/[0.08]" />
      
      {/* 中间分割线 */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-black/30 z-10" />
      
      {/* 数字容器 */}
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={currentDigit}
            initial={isFlipping ? { rotateX: -90, opacity: 0 } : false}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ 
              duration: 0.3,
              delay: delay / 1000,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="absolute font-mono text-inherit font-semibold"
            style={{ 
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden'
            }}
          >
            {currentDigit}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

interface FlipCounterProps {
  value: number | null;
  className?: string;
}

export default function FlipCounter({ value, className = '' }: FlipCounterProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplayValue('');
      return;
    }

    // 格式化数字，添加千位分隔符
    const formatted = value.toLocaleString('en-US');
    
    // 检测是否是数值增加（触发高亮动画）
    if (prevValue.current !== null && value > prevValue.current) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
    
    prevValue.current = value;
    setDisplayValue(formatted);
  }, [value]);

  if (value === null) {
    return <span className={className}>—</span>;
  }

  const digits = displayValue.split('');

  return (
    <motion.div 
      className={`inline-flex items-center gap-[2px] ${className}`}
      animate={isAnimating ? {
        scale: [1, 1.05, 1],
      } : {}}
      transition={{ duration: 0.5 }}
    >
      {/* 发光效果 */}
      {isAnimating && (
        <motion.div
          className="absolute inset-0 -m-2 rounded-xl bg-glacier-500/20 blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1 }}
        />
      )}
      
      {digits.map((char, index) => {
        // 逗号或其他分隔符直接显示
        if (char === ',' || char === '.') {
          return (
            <span key={`sep-${index}`} className="text-mist-500 mx-[1px]">
              {char}
            </span>
          );
        }
        
        return (
          <FlipDigit 
            key={`digit-${index}`} 
            digit={char} 
            delay={index * 30} // 级联延迟
          />
        );
      })}
      
      {/* 增长指示器 */}
      <AnimatePresence>
        {isAnimating && (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="ml-2 text-glacier-400 text-xs font-medium"
          >
            +1
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
