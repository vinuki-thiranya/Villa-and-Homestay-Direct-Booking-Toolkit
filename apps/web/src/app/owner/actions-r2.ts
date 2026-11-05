'use server';

// Server actions for Release 2 owner pages: inbox, concierge setup, housekeeping, add-ons, reviews, CRM.
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { OwnerKey } from '@/i18n/owner/t';
import { ownerApi, ownerUpload } from '@/lib/owner';
import { errorMsg, msg } from './action-messages';
import type { ActionResult } from './actions';

type Prev = ActionResult | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const num = (fd: FormData, k: string) => (str(fd, k) === '' ? undefined : Number(str(fd, k)));
const optNum = (fd: FormData, k: string) => (str(fd, k) === '' ? null : Number(str(fd, k)));
const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';

async function attempt(fn: () => Promise<unknown>, success: OwnerKey | '', vars?: Record<string, string | number>): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    unstable_rethrow(err);
    return { ok: false, message: await errorMsg(err) };
  }
  revalidatePath('/owner', 'layout');
  return { ok: true, message: success ? await msg(success, vars) : '' };
}

/** "a | b | c" lines → arrays of trimmed cells (house guide lists). */
function rows(fd: FormData, k: string): string[][] {
  return str(fd, k)
    .split('\n')
    .map((l) => l.split('|').map((c) => c.trim()))
    .filter((cells) => cells[0]);
}

// ---------------------------------------------------------------- inbox

export async function sendMessageAction(conversationId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/conversations/${conversationId}/messages`, { method: 'POST', body: { body: str(fd, 'body') } }), 'actions.sent');
}

export async function updateConversationAction(conversationId: string, patch: { aiPaused?: boolean; status?: string }, _: Prev): Promise<ActionResult> {
  const label = patch.status === 'closed' ? 'actions.markedResolved' : patch.status === 'open' ? 'actions.reopened' : patch.aiPaused ? 'actions.aiPaused' : 'actions.aiResumed';
  return attempt(() => ownerApi(`/conversations/${conversationId}`, { method: 'PATCH', body: patch }), label);
}

// ---------------------------------------------------------------- concierge setup

export async function saveConciergeAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () =>
      ownerApi(`/properties/${propertyId}/concierge`, {
        method: 'PUT',
        body: {
          conciergeEnabled: bool(fd, 'conciergeEnabled'),
          whatsappPhoneNumberId: optStr(fd, 'whatsappPhoneNumberId'),
          googleReviewUrl: optStr(fd, 'googleReviewUrl'),
          repeatGuestDiscountPct: num(fd, 'repeatGuestDiscountPct') ?? 10,
        },
      }),
    'actions.conciergeSaved',
  );
}

export async function saveGuideAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const guide = {
    wifiName: str(fd, 'wifiName'),
    wifiPassword: str(fd, 'wifiPassword'),
    arrival: str(fd, 'arrival'),
    rules: str(fd, 'rules'),
    checkoutNotes: str(fd, 'checkoutNotes'),
    emergency: rows(fd, 'emergency').map(([label, phone]) => ({ label: label!, phone: phone ?? '' })),
    places: rows(fd, 'places').map(([name, kind, note, mapsUrl]) => ({
      name: name!,
      kind: kind && ['restaurant', 'cafe', 'beach', 'atm', 'pharmacy', 'hospital', 'supermarket', 'sight'].includes(kind) ? kind : 'other',
      note: note ?? '',
      mapsUrl: mapsUrl || null,
    })),
  };
  return attempt(() => ownerApi(`/properties/${propertyId}/concierge`, { method: 'PUT', body: { guide } }), 'actions.guideSaved');
}

export async function saveKnowledgeAction(propertyId: string, id: string | null, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = { title: str(fd, 'title'), body: str(fd, 'body'), language: str(fd, 'language') || 'en' };
  return attempt(
    () => (id ? ownerApi(`/knowledge/${id}`, { method: 'PUT', body }) : ownerApi(`/properties/${propertyId}/knowledge`, { method: 'POST', body })),
    id ? 'actions.saved' : 'actions.knowledgeAdded',
  );
}

export async function deleteKnowledgeAction(id: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/knowledge/${id}`, { method: 'DELETE' }), 'actions.deleted');
}

export async function loadQuickRepliesAction(propertyId: string, _: Prev): Promise<ActionResult> {
  let added = 0;
  const res = await attempt(async () => {
    added = (await ownerApi<{ added: number }>(`/properties/${propertyId}/quick-replies/load-defaults`, { method: 'POST' })).added;
  }, '');
  return res.ok ? { ok: true, message: added ? await msg('actions.repliesAdded', { n: added }) : await msg('actions.repliesLoaded') } : res;
}

export async function saveQuickReplyAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = {
    topic: str(fd, 'topic').toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
    language: str(fd, 'language') || 'en',
    title: str(fd, 'title'),
    body: str(fd, 'body'),
    sortOrder: num(fd, 'sortOrder') ?? 0,
  };
  return attempt(() => ownerApi(`/properties/${propertyId}/quick-replies`, { method: 'POST', body }), 'actions.quickReplySaved');
}

export async function deleteQuickReplyAction(id: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/quick-replies/${id}`, { method: 'DELETE' }), 'actions.deleted');
}

export async function saveSequenceAction(propertyId: string, trigger: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () =>
      ownerApi(`/properties/${propertyId}/sequences`, {
        method: 'PUT',
        body: { trigger, enabled: bool(fd, 'enabled'), channel: str(fd, 'channel') || 'auto' },
      }),
    'actions.saved',
  );
}

// ---------------------------------------------------------------- housekeeping

export async function saveStaffAction(propertyId: string, id: string | null, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = { name: str(fd, 'name'), phone: optStr(fd, 'phone'), role: str(fd, 'role') || 'cleaner', active: id ? bool(fd, 'active') : true };
  return attempt(
    () => (id ? ownerApi(`/staff/${id}`, { method: 'PATCH', body }) : ownerApi(`/properties/${propertyId}/staff`, { method: 'POST', body })),
    id ? 'actions.saved' : 'actions.staffAdded',
  );
}

export async function createTaskAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = {
    date: str(fd, 'date'),
    type: str(fd, 'type'),
    title: str(fd, 'title'),
    roomId: optStr(fd, 'roomId'),
    assigneeStaffId: optStr(fd, 'assigneeStaffId'),
    notes: str(fd, 'notes'),
    cost: optNum(fd, 'cost'),
  };
  return attempt(() => ownerApi(`/properties/${propertyId}/tasks`, { method: 'POST', body }), 'actions.taskAdded');
}

export async function updateTaskAction(taskId: string, patch: { status?: string }, _: Prev, fd?: FormData): Promise<ActionResult> {
  const body: Record<string, unknown> = { ...patch };
  if (fd?.has('assigneeStaffId')) body.assigneeStaffId = optStr(fd, 'assigneeStaffId');
  if (fd?.has('notes')) body.notes = str(fd, 'notes');
  if (fd?.has('cost')) body.cost = optNum(fd, 'cost');
  const labels: Record<string, OwnerKey> = { done: 'actions.taskDone', skipped: 'actions.taskSkipped', in_progress: 'actions.taskStarted', todo: 'actions.reopened' };
  const label: OwnerKey = (patch.status && labels[patch.status]) || 'actions.saved';
  return attempt(() => ownerApi(`/tasks/${taskId}`, { method: 'PATCH', body }), label);
}

export async function taskPhotoAction(taskId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: await msg('actions.choosePhoto') };
  return attempt(() => ownerUpload(`/tasks/${taskId}/photos`, file), 'actions.photoAdded');
}

export async function buildBoardAction(propertyId: string, _: Prev): Promise<ActionResult> {
  let built = false;
  const res = await attempt(async () => {
    built = (await ownerApi<{ built: boolean }>(`/properties/${propertyId}/tasks/build-board`, { method: 'POST' })).built;
  }, '');
  return res.ok
    ? { ok: true, message: await msg(built ? 'actions.boardBuilt' : 'actions.boardExists') }
    : res;
}

// ---------------------------------------------------------------- add-ons

export async function saveProviderAction(id: string | null, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = { name: str(fd, 'name'), phone: str(fd, 'phone'), serviceTypes: fd.getAll('serviceTypes').map(String), active: id ? bool(fd, 'active') : true };
  return attempt(() => (id ? ownerApi(`/providers/${id}`, { method: 'PATCH', body }) : ownerApi('/providers', { method: 'POST', body })), id ? 'actions.saved' : 'actions.providerAdded');
}

export async function saveAddOnAction(propertyId: string, id: string | null, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = {
    name: str(fd, 'name'),
    description: str(fd, 'description'),
    category: str(fd, 'category'),
    price: num(fd, 'price'),
    currency: str(fd, 'currency') || 'USD',
    providerId: optStr(fd, 'providerId'),
    commissionPct: num(fd, 'commissionPct') ?? 12.5,
    platformPct: num(fd, 'platformPct') ?? 10,
    leadTimeHours: num(fd, 'leadTimeHours') ?? 24,
    photoUrl: optStr(fd, 'photoUrl'),
    active: id ? bool(fd, 'active') : true,
    sortOrder: num(fd, 'sortOrder') ?? 0,
  };
  return attempt(
    () => (id ? ownerApi(`/add-ons/${id}`, { method: 'PATCH', body }) : ownerApi(`/properties/${propertyId}/add-ons`, { method: 'POST', body })),
    id ? 'actions.saved' : 'actions.experienceAdded',
  );
}

export async function orderStatusAction(orderId: string, status: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/add-on-orders/${orderId}/status`, { method: 'POST', body: { status } }), 'actions.markedStatus', {
    status: await msg(`shared.orderStatus.${status}` as OwnerKey),
  });
}

export async function resendJobCardAction(orderId: string, _: Prev): Promise<ActionResult> {
  let sent = false;
  const res = await attempt(async () => {
    sent = (await ownerApi<{ sent: boolean }>(`/add-on-orders/${orderId}/resend`, { method: 'POST' })).sent;
  }, '');
  return res.ok ? { ok: sent, message: await msg(sent ? 'actions.jobCardSent' : 'actions.noProviderPhone') } : res;
}

export async function ownerOrderAction(bookingId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = { addOnId: str(fd, 'addOnId'), date: str(fd, 'date'), time: optStr(fd, 'time'), qty: num(fd, 'qty') ?? 1, notes: str(fd, 'notes') };
  return attempt(() => ownerApi(`/bookings/${bookingId}/add-ons`, { method: 'POST', body }), 'actions.ordered');
}

// ---------------------------------------------------------------- reviews & CRM

export async function replyReviewAction(reviewId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(
    () => ownerApi(`/reviews/${reviewId}/reply`, { method: 'POST', body: { reply: str(fd, 'reply'), public: bool(fd, 'public') } }),
    'actions.replySaved',
  );
}

export async function guestNotesAction(guestId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/guests/${guestId}`, { method: 'PATCH', body: { notes: str(fd, 'notes') } }), 'actions.notesSaved');
}

export async function keepGuestAction(guestId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  return attempt(() => ownerApi(`/guests/${guestId}/keep-profile`, { method: 'PUT', body: { keep: bool(fd, 'keep') } }), 'actions.guestKept');
}

export async function eraseGuestAction(guestId: string): Promise<ActionResult> {
  return attempt(() => ownerApi(`/guests/${guestId}/erase`, { method: 'POST', body: { confirm: true } }), 'actions.guestErased');
}

export async function createCodeAction(propertyId: string, _: Prev, fd: FormData): Promise<ActionResult> {
  const body = {
    code: str(fd, 'code'),
    pct: num(fd, 'pct'),
    expiresAt: str(fd, 'expiresAt'),
    maxUses: num(fd, 'maxUses') ?? 1,
    guestId: optStr(fd, 'guestId'),
  };
  return attempt(() => ownerApi(`/properties/${propertyId}/discount-codes`, { method: 'POST', body }), 'actions.codeCreated');
}

export async function deactivateCodeAction(codeId: string, _: Prev): Promise<ActionResult> {
  return attempt(() => ownerApi(`/discount-codes/${codeId}/deactivate`, { method: 'POST' }), 'actions.codeOff');
}
