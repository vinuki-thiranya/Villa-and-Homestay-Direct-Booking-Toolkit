import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Language } from '@staydirect/shared';
import { CONFIG, type AppConfig } from '../../config.js';
import { META_LANG, orderedParams, templateByName } from './templates.js';

export interface SendResult {
  ok: boolean;
  /** 'sent' | 'logged' (provider not configured, dev) | 'failed' */
  status: 'sent' | 'logged' | 'failed';
  providerId?: string;
  error?: string;
}

@Injectable()
export class EmailChannel {
  private readonly log = new Logger('Email');
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  async send(msg: { to: string; subject: string; html: string; text: string; replyTo?: string | null }): Promise<SendResult> {
    if (!this.config.RESEND_API_KEY) {
      this.log.log(`[dev email] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
      return { ok: true, status: 'logged' };
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${this.config.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: this.config.EMAIL_FROM,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          reply_to: msg.replyTo ?? undefined,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) return { ok: false, status: 'failed', error: body.message ?? `HTTP ${res.status}` };
      return { ok: true, status: 'sent', providerId: body.id };
    } catch (err) {
      return { ok: false, status: 'failed', error: (err as Error).message };
    }
  }
}

/**
 * WhatsApp Cloud API. Outside the 24-hour service window only approved templates can be sent
 * (templates.ts). `from` is the sending phone_number_id: the property's own number when it has
 * one, otherwise the platform number.
 */
@Injectable()
export class WhatsAppChannel {
  private readonly log = new Logger('WhatsApp');
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  get configured(): boolean {
    return Boolean(this.config.WHATSAPP_TOKEN && this.config.WHATSAPP_PHONE_NUMBER_ID);
  }

  /** Send a template by name with named variables (see templates.ts). */
  sendNamedTemplate(to: string, name: string, lang: Language, vars: Record<string, string | number>, from?: string | null): Promise<SendResult> {
    const def = templateByName(name);
    const language = def.languages.includes(lang) ? lang : 'en';
    return this.sendTemplate(to, name, orderedParams(def, language, vars), META_LANG[language], from);
  }

  async sendTemplate(to: string, template: string, params: string[], language = 'en', from?: string | null): Promise<SendResult> {
    if (!this.configured) {
      this.log.log(`[dev whatsapp] to=${to} template=${template} params=${JSON.stringify(params)}`);
      return { ok: true, status: 'logged' };
    }
    return this.post(
      {
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: template,
          language: { code: language },
          components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: text.slice(0, 1000) })) }],
        },
      },
      from,
    );
  }

  async sendText(to: string, body: string, from?: string | null): Promise<SendResult> {
    if (!this.configured) {
      this.log.log(`[dev whatsapp] to=${to}
${body}`);
      return { ok: true, status: 'logged' };
    }
    return this.post({ messaging_product: 'whatsapp', to: to.replace(/^\+/, ''), type: 'text', text: { body: body.slice(0, 4096), preview_url: true } }, from);
  }

  private async post(payload: unknown, from?: string | null): Promise<SendResult> {
    const sender = from || this.config.WHATSAPP_PHONE_NUMBER_ID;
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${sender}/messages`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.config.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
      if (!res.ok) return { ok: false, status: 'failed', error: body.error?.message ?? `HTTP ${res.status}` };
      return { ok: true, status: 'sent', providerId: body.messages?.[0]?.id };
    } catch (err) {
      return { ok: false, status: 'failed', error: (err as Error).message };
    }
  }
}

@Injectable()
export class SmsChannel {
  private readonly log = new Logger('SMS');
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  async send(to: string, text: string): Promise<SendResult> {
    if (this.config.SMS_PROVIDER === 'console') {
      this.log.log(`[dev sms] to=${to}: ${text}`);
      return { ok: true, status: 'logged' };
    }
    // Notify.lk: https://developer.notify.lk — expects the number without "+".
    const url = new URL('https://app.notify.lk/api/v1/send');
    url.searchParams.set('user_id', this.config.NOTIFYLK_USER_ID);
    url.searchParams.set('api_key', this.config.NOTIFYLK_API_KEY);
    url.searchParams.set('sender_id', this.config.NOTIFYLK_SENDER_ID);
    url.searchParams.set('to', to.replace(/^\+/, ''));
    url.searchParams.set('message', text);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const body = (await res.json().catch(() => ({}))) as { status?: string };
      if (!res.ok || body.status !== 'success') return { ok: false, status: 'failed', error: JSON.stringify(body) };
      return { ok: true, status: 'sent' };
    } catch (err) {
      return { ok: false, status: 'failed', error: (err as Error).message };
    }
  }
}
