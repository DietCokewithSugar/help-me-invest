'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Testimonials() {
  const { t } = useLanguage();

  const testimonials = [
    {
      id: 1,
      title: t.testimonials.t1Title,
      role: t.testimonials.t1Role,
      content: t.testimonials.t1Content,
      avatar: 'L',
      color: 'text-glacier-500',
      bgColor: 'bg-glacier-500/10',
      borderColor: 'border-glacier-500/20',
    },
    {
      id: 2,
      title: t.testimonials.t2Title,
      role: t.testimonials.t2Role,
      content: t.testimonials.t2Content,
      avatar: 'Y',
      color: 'text-gemini-purple',
      bgColor: 'bg-gemini-purple/10',
      borderColor: 'border-gemini-purple/20',
    },
    {
      id: 3,
      title: t.testimonials.t3Title,
      role: t.testimonials.t3Role,
      content: t.testimonials.t3Content,
      avatar: 'W',
      color: 'text-gemini-yellow',
      bgColor: 'bg-gemini-yellow/10',
      borderColor: 'border-gemini-yellow/20',
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
      {testimonials.map((testimonial, index) => (
        <motion.div
          key={testimonial.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="group relative p-6 bg-white/5 border border-white/10 rounded-md hover:border-white/20 transition-colors"
        >
          {/* Content */}
          <div className="relative z-10">
            <p className="text-mist-200 leading-relaxed text-[15px] mb-6">
              &ldquo;{testimonial.content}&rdquo;
            </p>
          </div>

          {/* Author */}
          <div className="relative z-10 flex items-center gap-4 pt-6 border-t border-white/5">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center font-mono text-lg font-bold border ${testimonial.bgColor} ${testimonial.color} ${testimonial.borderColor}`}>
              {testimonial.avatar}
            </div>

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
