'use client';

import { motion } from 'framer-motion';

const TESTIMONIALS = [
  {
    id: 1,
    title: '理性的架构师',
    role: '资深产品经理',
    content: '作为一个非金融背景的人，智投研究让我第一次真正"读懂"了财报。桑基图展示的资金流向比任何 Excel 表格都直观，帮我在选股时快速过滤掉财务不健康的公司。',
    avatar: 'L',
    color: 'text-glacier-500',
    bgColor: 'bg-glacier-500/10',
    borderColor: 'border-glacier-500/20',
  },
  {
    id: 2,
    title: '严谨的分析师',
    role: '量化研究员',
    content: 'AI 生成的竞争格局分析相当专业，会自动整合最新的行业新闻和财报电话会议内容。省去了我大量搜索整理资料的时间，让我可以专注于更深度的模型构建。',
    avatar: 'Y',
    color: 'text-gemini-purple',
    bgColor: 'bg-gemini-purple/10',
    borderColor: 'border-gemini-purple/20',
  },
  {
    id: 3,
    title: '稳健的投资者',
    role: '个人价值投资者',
    content: '以前研究一家公司至少需要半天，现在 30 秒就能获得一份结构清晰的研报。最关键的是，它不只是罗列数据，而是帮我理解数据背后的商业逻辑。',
    avatar: 'W',
    color: 'text-gemini-yellow',
    bgColor: 'bg-gemini-yellow/10',
    borderColor: 'border-gemini-yellow/20',
  },
];

export default function Testimonials() {
  return (
    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
      {TESTIMONIALS.map((testimonial, index) => (
        <motion.div
          key={testimonial.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="group relative p-6 bg-white/5 border border-white/10 rounded-md hover:border-white/20 transition-colors"
        >
          {/* 内容 */}
          <div className="relative z-10">
            <p className="text-mist-200 leading-relaxed text-[15px] mb-6">
              "{testimonial.content}"
            </p>
          </div>

          {/* 作者信息 */}
          <div className="relative z-10 flex items-center gap-4 pt-6 border-t border-white/5">
            {/* 头像 - 极简风格 */}
            <div className={`w-10 h-10 rounded-md flex items-center justify-center font-mono text-lg font-bold border ${testimonial.bgColor} ${testimonial.color} ${testimonial.borderColor}`}>
              {testimonial.avatar}
            </div>

            {/* 名称和角色 */}
            <div>
              <h4 className="text-white font-medium text-sm">{testimonial.title}</h4>
              <p className="text-mist-500 text-xs">{testimonial.role}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
