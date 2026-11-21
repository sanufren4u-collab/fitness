'use client';

import { useState } from 'react';
import { CreditCard, Dumbbell, MessageCircle, X } from 'lucide-react';
import { useTranslation } from '@/components/shared/LocaleProvider';

const supportNumber = '919582227325';
const supportTopics = [
  {
    label: 'Payment help',
    message: 'Hello Byayamshala, I need help with a payment.',
    Icon: CreditCard,
  },
  {
    label: 'Membership help',
    message: 'Hello Byayamshala, I have a question about my membership.',
    Icon: Dumbbell,
  },
  {
    label: 'General question',
    message: 'Hello Byayamshala, I have a question.',
    Icon: MessageCircle,
  },
];

export function WhatsAppSupportWidget() {
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 sm:right-6">
      {isOpen && (
        <section
          id="whatsapp-support-panel"
          aria-label={t('WhatsApp Support')}
          className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50"
        >
          <div className="flex items-start justify-between bg-emerald-700 px-4 py-4">
            <div>
              <h2 className="text-sm font-bold text-white">{t('Byayamshala Support')}</h2>
              <p className="mt-1 text-xs text-emerald-50">{t('Choose a topic to chat on WhatsApp')}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t('Close WhatsApp support')}
              className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 p-3">
            {supportTopics.map(({ label, message, Icon }) => (
              <a
                key={label}
                href={`https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-200 transition hover:border-emerald-500/50 hover:bg-zinc-800"
              >
                <Icon aria-hidden="true" className="h-4 w-4 text-emerald-400" />
                <span>{t(label)}</span>
              </a>
            ))}
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? t('Close WhatsApp support') : t('Open WhatsApp support')}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'whatsapp-support-panel' : undefined}
        className="inline-flex h-14 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
      >
        {isOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <MessageCircle aria-hidden="true" className="h-5 w-5" />}
        <span>{t('WhatsApp Support')}</span>
      </button>
    </div>
  );
}
