'use client';

import { INDIAN_STATES } from '@/lib/india';
import { described, Field, inputClass } from './fields';

export interface AddressDraft {
  name: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
}

export const EMPTY_ADDRESS: AddressDraft = { name: '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '' };

/** Indian address fields. `errors` uses keys like "address.pincode" (or with another prefix). */
export function AddressFields({
  value,
  onChange,
  errors,
  prefix = 'address',
  idPrefix = 'addr',
  pincodeHint,
}: {
  value: AddressDraft;
  onChange: (next: AddressDraft) => void;
  errors: Record<string, string>;
  prefix?: string;
  idPrefix?: string;
  pincodeHint?: string;
}) {
  const set = (k: keyof AddressDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const err = (k: keyof AddressDraft) => errors[`${prefix}.${k}`];
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={id('name')} label="Full name" error={err('name')} className="sm:col-span-2">
        <input id={id('name')} autoComplete="name" value={value.name} onChange={set('name')} className={inputClass(err('name'))} {...described(id('name'), err('name'))} />
      </Field>
      <Field id={id('line1')} label="House, flat or building" error={err('line1')} className="sm:col-span-2">
        <input
          id={id('line1')}
          autoComplete="address-line1"
          value={value.line1}
          onChange={set('line1')}
          placeholder="Flat 12, Lake View Apartments"
          className={inputClass(err('line1'))}
          {...described(id('line1'), err('line1'))}
        />
      </Field>
      <Field id={id('line2')} label="Area and street" optional error={err('line2')} className="sm:col-span-2">
        <input id={id('line2')} autoComplete="address-line2" value={value.line2} onChange={set('line2')} placeholder="MG Road, Indiranagar" className={inputClass(err('line2'))} {...described(id('line2'), err('line2'))} />
      </Field>
      <Field id={id('landmark')} label="Landmark" optional error={err('landmark')} className="sm:col-span-2">
        <input id={id('landmark')} value={value.landmark} onChange={set('landmark')} placeholder="Near the metro station" className={inputClass(err('landmark'))} {...described(id('landmark'), err('landmark'))} />
      </Field>
      <Field id={id('pincode')} label="Pincode" error={err('pincode')} hint={pincodeHint}>
        <input
          id={id('pincode')}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={value.pincode}
          onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, '') })}
          placeholder="560001"
          className={inputClass(err('pincode'))}
          {...described(id('pincode'), err('pincode'), pincodeHint)}
        />
      </Field>
      <Field id={id('city')} label="Town or city" error={err('city')}>
        <input id={id('city')} autoComplete="address-level2" value={value.city} onChange={set('city')} className={inputClass(err('city'))} {...described(id('city'), err('city'))} />
      </Field>
      <Field id={id('state')} label="State" error={err('state')} className="sm:col-span-2">
        <select id={id('state')} autoComplete="address-level1" value={value.state} onChange={set('state')} className={inputClass(err('state'))} {...described(id('state'), err('state'))}>
          <option value="" disabled>
            Choose a state
          </option>
          {INDIAN_STATES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
