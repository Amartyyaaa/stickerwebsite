'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from '@/actions/account';
import { AddressFields, EMPTY_ADDRESS, type AddressDraft } from '@/components/checkout/address-fields';
import { described, Field, inputClass } from '@/components/checkout/fields';
import { PlusIcon } from '@/components/icons';
import { formatPhone } from '@/lib/india';
import type { SavedAddressView } from '@/lib/orders/addresses';

type Editing = { id?: number; address: AddressDraft; phone: string } | null;

/** Saved addresses: add, edit, delete and choose the default for checkout. */
export function AddressBook({ addresses }: { addresses: SavedAddressView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setMessage(null);
    const r = await saveAddressAction({ id: editing.id, address: { ...editing.address, phone: editing.phone } });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.fields ?? {});
      setMessage(r.error);
      return;
    }
    setEditing(null);
    setErrors({});
    router.refresh();
  };

  const run = async (fn: () => Promise<{ ok: boolean }>) => {
    setBusy(true);
    await fn();
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      {addresses.length === 0 && !editing && <p className="text-sm text-muted">No saved addresses yet. Add one here, or tick “Save this address” at checkout.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="grid content-between gap-3 rounded-[4px] border border-line-2 bg-bg p-4 text-sm">
            <div>
              <p className="flex items-center gap-2">
                <b>{a.name}</b>
                {a.isDefault && <span className="rounded-[2px] bg-lime px-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-bg">Default</span>}
              </p>
              <p className="mt-1 text-muted">{[a.line1, a.line2, a.landmark && `Near ${a.landmark}`, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(', ')}</p>
              <p className="mt-1 text-muted">{formatPhone(a.phone)}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
              <button type="button" className="text-lime hover:underline" onClick={() => setEditing({ id: a.id, address: a, phone: a.phone })}>
                Edit
              </button>
              {!a.isDefault && (
                <button type="button" className="text-ink hover:underline" disabled={busy} onClick={() => run(() => setDefaultAddressAction(a.id))}>
                  Make default
                </button>
              )}
              <button
                type="button"
                className="text-muted hover:text-red hover:underline"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Delete this address?')) void run(() => deleteAddressAction(a.id));
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <form
          className="grid gap-4 rounded-[4px] border border-line-2 bg-bg p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          noValidate
        >
          <h3 className="font-display text-xl uppercase">{editing.id ? 'Edit address' : 'New address'}</h3>
          <AddressFields value={editing.address} onChange={(address) => setEditing({ ...editing, address })} errors={errors} idPrefix="book" />
          <Field id="book-phone" label="Mobile number" error={errors['address.phone']}>
            <input
              id="book-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={editing.phone}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              className={inputClass(errors['address.phone'])}
              {...described('book-phone', errors['address.phone'])}
            />
          </Field>
          {message && (
            <p role="alert" className="text-sm font-semibold text-red">
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? 'Saving…' : 'Save address'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing(null);
                setErrors({});
                setMessage(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => setEditing({ address: EMPTY_ADDRESS, phone: '' })}>
          <PlusIcon size={16} /> Add an address
        </button>
      )}
    </div>
  );
}
