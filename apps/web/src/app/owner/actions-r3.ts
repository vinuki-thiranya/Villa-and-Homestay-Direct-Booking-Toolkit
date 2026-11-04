'use server';

// Server actions for Release 3 owner pages: team, property owners & statements, branding,
// invoices & long stays, OTA connection, providers, support.
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { ownerApi, PROPERTY_COOKIE } from '@/lib/owner';
import { isPlanError } from '@/lib/owner-r3';
import type { ActionResult } from './actions';

type Prev = ActionResult | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const num = (fd: FormData, k: string) => (str(fd, k) === '' ? undefined : Number(str(fd, k)));
const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';

async function attempt(fn: () => Promise<unknown>, success: string): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    unstable_rethrow(err);
    if (isPlanError(err)) return { ok: false, message: `${(err as ApiError).message}` };
    return { ok: false, message: err instanceof Error ? err.message : 'Something went wrong' };
  }
  revalidatePath('/owner', 'layout');
  return { ok: true, message: success };
}

// ---------------------------------------------------------------- portfolio

/** Open one property from the portfolio: remember it and go to its Today screen. */
export async function openPropertyAction(propertyId: string) {
  (await cookies()).set(PROPERTY_COOKIE, propertyId, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  redirect('/owner');
}

// ---------------------------------------------------------------- team

export async function inviteAction(_: Prev, fd: FormData): Promise<ActionResult> {
  let url = '';
  const res = await attempt(async () => {
    const r = await ownerApi<{ url: string }>('/team/invites', {
      method: 'POST',
      body: { name: str(fd, 'name'), phone: str(fd, 'phone'), role: str(fd, 'role'), propertyIds: fd.getAll('propertyIds').map(String) },
    });
    url = r.url;
  }, 'Invite sent');
  return res.ok ? { ok: true, message: `Invite sent by WhatsApp/SMS. Link: ${url}` } : res;
}

export async function revokeInviteAction(id: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/team/invites/${id}`, { method: 'DELETE' }), 'Invite revoked');
}

export async function updateMemberAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/team/members/${id}`, { method: 'PATCH', body: { role: str(fd, 'role'), propertyIds: fd.getAll('propertyIds').map(String) } }),
    'Access saved',
  );
}

export async function removeMemberAction(id: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/team/members/${id}`, { method: 'DELETE' }), 'Removed from the team');
}

// ---------------------------------------------------------------- property owners & statements

function payoutDetails(fd: FormData) {
  if (!str(fd, 'accountNumber')) return undefined; // write-only: leave unchanged when blank
  return {
    bankName: str(fd, 'bankName'),
    accountName: str(fd, 'accountName'),
    accountNumber: str(fd, 'accountNumber'),
    branch: str(fd, 'branch'),
    swift: str(fd, 'swift'),
  };
}

export async function saveOwnerAction(id: string | null, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = {
    name: str(fd, 'name'),
    email: optStr(fd, 'email'),
    phone: optStr(fd, 'phone'),
    managementFeePct: num(fd, 'managementFeePct') ?? 20,
    notes: str(fd, 'notes'),
    payoutDetails: payoutDetails(fd),
    ...(id ? { active: bool(fd, 'active') } : {}),
  };
  return attempt(() => ownerApi(id ? `/owners/${id}` : '/owners', { method: id ? 'PATCH' : 'POST', body }), id ? 'Owner saved' : 'Owner added');
}

export async function assignOwnerAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/properties/${propertyId}/owner`, { method: 'PUT', body: { ownerId: optStr(fd, 'ownerId') } }), 'Owner assigned');
}

export async function finalizeStatementAction(ownerId: string, period: string, reissue: boolean, _: Prev): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/owners/${ownerId}/statements`, { method: 'POST', body: { period, reissue } }),
    reissue ? 'Statement re-issued; the earlier version is superseded' : 'Statement finalised',
  );
}

// ---------------------------------------------------------------- branding

export async function saveBrandAction(_: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () =>
      ownerApi('/brand', {
        method: 'PUT',
        body: {
          displayName: str(fd, 'displayName'),
          logoUrl: optStr(fd, 'logoUrl'),
          primaryColor: optStr(fd, 'primaryColor'),
          accentColor: optStr(fd, 'accentColor'),
          supportEmail: optStr(fd, 'supportEmail'),
        },
      }),
    'Brand saved. Guest sites update within a minute.',
  );
}

// ---------------------------------------------------------------- invoices & long stays

export async function issueInvoiceAction(bookingId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const periodStart = optStr(fd, 'periodStart');
  const periodEnd = optStr(fd, 'periodEnd');
  return attempt(
    () =>
      ownerApi(`/bookings/${bookingId}/invoices`, {
        method: 'POST',
        body: { ...(periodStart ? { periodStart } : {}), ...(periodEnd ? { periodEnd } : {}) },
      }),
    'Invoice issued',
  );
}

export async function addReadingAction(bookingId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () =>
      ownerApi(`/bookings/${bookingId}/utility-readings`, {
        method: 'POST',
        body: {
          meter: str(fd, 'meter'),
          periodStart: str(fd, 'periodStart'),
          periodEnd: str(fd, 'periodEnd'),
          startReading: num(fd, 'startReading'),
          endReading: num(fd, 'endReading'),
          unitRate: num(fd, 'unitRate'),
        },
      }),
    'Reading added',
  );
}

export async function deleteReadingAction(id: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/utility-readings/${id}`, { method: 'DELETE' }), 'Reading deleted');
}

export async function passportAction(guestId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/guests/${guestId}/identity`, { method: 'PUT', body: { passportLast4: optStr(fd, 'passportLast4') } }), 'Saved');
}

// ---------------------------------------------------------------- OTA connection

export async function connectChannelAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const channels = fd.getAll('channels').map(String);
  return attempt(
    () => ownerApi(`/properties/${propertyId}/channel`, { method: 'POST', body: { partner: 'simulated', channels: channels.length ? channels : ['booking_com', 'airbnb'] } }),
    'Connected. The full calendar is being sent now.',
  );
}

export async function channelStatusAction(propertyId: string, status: 'active' | 'paused', _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/properties/${propertyId}/channel/status`, { method: 'POST', body: { status } }), status === 'paused' ? 'Paused' : 'Resumed');
}

export async function channelSyncAction(propertyId: string, _: Prev): Promise<ActionResult> {
  let msg = '';
  const res = await attempt(async () => {
    const r = await ownerApi<{ pushed: number; imported: number }>(`/properties/${propertyId}/channel/sync`, { method: 'POST' });
    msg = `Sent ${r.pushed} room-night${r.pushed === 1 ? '' : 's'}, imported ${r.imported} booking${r.imported === 1 ? '' : 's'}`;
  }, '');
  return res.ok ? { ok: true, message: msg } : res;
}

export async function simulateReservationAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const lag = bool(fd, 'lag');
  return attempt(
    () =>
      ownerApi(`/properties/${propertyId}/channel/simulator/reservations${lag ? '?lag=1' : ''}`, {
        method: 'POST',
        body: {
          roomId: str(fd, 'roomId'),
          from: str(fd, 'from'),
          to: str(fd, 'to'),
          channel: str(fd, 'channel') || 'booking_com',
          guestName: str(fd, 'guestName') || 'OTA Guest',
          guests: num(fd, 'guests') ?? 2,
          total: num(fd, 'total') ?? 0,
          currency: str(fd, 'currency') || 'USD',
        },
      }),
    'Test reservation created and imported',
  );
}

// ---------------------------------------------------------------- providers

export async function reinstateProviderAction(id: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/providers/${id}/reinstate`, { method: 'POST' }), 'Provider reinstated. Switch their add-ons back on when ready.');
}

// ---------------------------------------------------------------- support

export async function createTicketAction(_: Prev, fd: FormData): Promise<ActionResult> {
  let id = '';
  const res = await attempt(async () => {
    const r = await ownerApi<{ id: string }>('/support/tickets', {
      method: 'POST',
      body: { subject: str(fd, 'subject'), body: str(fd, 'body'), priority: str(fd, 'priority') || 'normal' },
    });
    id = r.id;
  }, 'Sent');
  if (res.ok) redirect(`/owner/support/${id}`);
  return res;
}

export async function replyTicketAction(id: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/support/tickets/${id}/messages`, { method: 'POST', body: { body: str(fd, 'body') } }), 'Sent');
}
