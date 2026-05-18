'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { XIcon } from '@/components/Icons';
import { useModalA11y } from '@/hooks/useModalA11y';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  scanQr: string;
  lookForward: string;
  wechatLabel: string;
  emailLabel: string;
  wechatId?: string;
  email?: string;
  qrImageSrc?: string;
  closeLabel?: string;
}

export default function ContactModal({
  isOpen,
  onClose,
  title,
  scanQr,
  lookForward,
  wechatLabel,
  emailLabel,
  wechatId = 'wkzSteven',
  email = 'wangkaizhou2016@gmail.com',
  qrImageSrc = '/wechat-qr.jpg',
  closeLabel = '关闭',
}: ContactModalProps) {
  const { dialogRef, titleId, descriptionId } = useModalA11y({ isOpen, onClose });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef as any}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative w-full max-w-sm mx-4 rounded-md border border-white/10 bg-surface p-6 md:p-7 focus:outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 inline-flex items-center justify-center h-11 w-11 rounded-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              aria-label={closeLabel}
            >
              <XIcon size={16} className="text-mist-400" />
            </button>

            <h3 id={titleId} className="text-lg font-semibold text-mist-200 text-center">{title}</h3>
            <p id={descriptionId} className="mt-1 text-sm text-mist-400 text-center">{scanQr}</p>

            <div className="mt-5 text-center space-y-3">
              <div className="flex justify-center">
                <Image
                  src={qrImageSrc}
                  alt="WeChat QR"
                  width={224}
                  height={224}
                  className="w-56 h-56 object-contain rounded-sm border border-white/10 bg-white p-1"
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-mist-400">{wechatLabel}</span>
                <span className="font-mono text-mist-200 select-all">{wechatId}</span>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-mist-400">{emailLabel}</span>
                <a href={`mailto:${email}`} className="font-mono text-glacier-500 hover:underline">
                  {email}
                </a>
              </div>
            </div>

            <p className="mt-4 text-xs text-mist-500 text-center">{lookForward}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
