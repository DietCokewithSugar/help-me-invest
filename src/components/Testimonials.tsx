'use client';

import { motion } from 'framer-motion';

const TESTIMONIALS = [
  {
    id: 1,
    title: '理性的架构师',
    role: '资深产品经理',
    content: '作为一个非金融背景的人，智投研究让我第一次真正"读懂"了财报。桑基图展示的资金流向比任何 Excel 表格都直观，帮我在选股时快速过滤掉财务不健康的公司。',
    avatar: 'L',
    gradient: 'from-glacier-500 to-gemini-blue',
  },
  {
    id: 2,
    title: '严谨的分析师',
    role: '量化研究员',
    content: 'AI 生成的竞争格局分析相当专业，会自动整合最新的行业新闻和财报电话会议内容。省去了我大量搜索整理资料的时间，让我可以专注于更深度的模型构建。',
    avatar: 'Y',
    gradient: 'from-gemini-purple to-aurora-3',
  },
  {
    id: 3,
    title: '稳健的投资者',
    role: '个人价值投资者',
    content: '以前研究一家公司至少需要半天，现在 30 秒就能获得一份结构清晰的研报。最关键的是，它不只是罗列数据，而是帮我理解数据背后的商业逻辑。',
    avatar: 'W',
    gradient: 'from-gemini-yellow to-gemini-red',
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
          className="testimonial-card group"
        >
          {/* 引号装饰已在 CSS 中通过 ::before 实现 */}
          
          {/* 内容 */}
          <div className="relative z-10 pt-8">
            <p className="text-mist-300 leading-relaxed text-[15px]">
              {testimonial.content}
            </p>
          </div>
          
          {/* 作者信息 */}
          <div className="relative z-10 mt-8 flex items-center gap-4">
            {/* 头像 */}
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-medium text-lg shadow-lg`}>
              {testimonial.avatar}
            </div>
            
            {/* 名称和角色 */}
            <div>
              <h4 className="text-white font-medium">{testimonial.title}</h4>
              <p className="text-mist-500 text-sm">{testimonial.role}</p>
            </div>
          </div>
          
          {/* 悬停时的光效 */}
          <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${testimonial.gradient} opacity-[0.03]`} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
