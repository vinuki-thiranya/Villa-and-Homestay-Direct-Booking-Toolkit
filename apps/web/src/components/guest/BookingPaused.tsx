import { waLink } from '@/lib/format';

export function BookingPaused({ name, whatsapp }: { name: string; whatsapp: string | null }) {
  const wa = waLink(whatsapp, `Hello ${name}, are these dates available?`);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        <strong>Online booking is paused.</strong> Send us your dates on WhatsApp and we will reply quickly.
      </p>
      {wa && (
        <a href={wa} className="btn-primary" target="_blank" rel="noopener noreferrer">
          Enquire on WhatsApp
        </a>
      )}
    </div>
  );
}
