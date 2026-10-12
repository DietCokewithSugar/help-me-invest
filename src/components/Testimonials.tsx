'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function Testimonials() {
  const { t } = useLanguage();

  const testimonials = [
    { id: 1, title: t.testimonials.t1Title, role: t.testimonials.t1Role, content: t.testimonials.t1Content },
    { id: 2, title: t.testimonials.t2Title, role: t.testimonials.t2Role, content: t.testimonials.t2Content },
    { id: 3, title: t.testimonials.t3Title, role: t.testimonials.t3Role, content: t.testimonials.t3Content },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {testimonials.map((testimonial) => (
        <figure key={testimonial.id} className="panel flex flex-col p-5">
          <blockquote className="flex-1 text-[14px] leading-6 text-text-1">
            &ldquo;{testimonial.content}&rdquo;
          </blockquote>
          <figcaption className="mt-4 border-t border-line pt-3">
            <div className="text-[13px] font-semibold text-fg">{testimonial.title}</div>
            <div className="text-[12px] text-text-3">{testimonial.role}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
