/**
 * Cross-device persistence via Supabase Storage.
 * Bucket: "ema-data" (must be set to Public in Supabase dashboard)
 */
import { EnergyData } from '../types/energy';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BUCKET       = 'ema-data';
const FILE         = 'latest.json';

export function isCloudEnabled(): boolean {
  return !!(SUPABASE_URL && SUPABASE_KEY &&
    !SUPABASE_URL.includes('YOUR_') &&
    SUPABASE_URL.startsWith('https://'));
}

type Row = {
  date: string; produced: number; consumed: number;
  exported: number; imported: number; charged: number; discharged: number;
};
type Payload = { fileName: string; uploadedAt: string; rows: Row[] };

export async function saveDataToCloud(data: EnergyData[], fileName: string): Promise<boolean> {
  if (!isCloudEnabled()) return false;
  const payload: Payload = {
    fileName,
    uploadedAt: new Date().toISOString(),
    rows: data.map(d => ({
      date:       d.date.toISOString().slice(0, 10),
      produced:   d.produced,
      consumed:   d.consumed,
      exported:   d.exported,
      imported:   d.imported,
      charged:    d.charged,
      discharged: d.discharged,
    })),
  };

  try {
    // Use multipart/form-data upload (Supabase Storage requirement for upsert)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const form = new FormData();
    form.append('', blob, FILE);

    // Try upsert (update if exists)
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE}`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY!,
          'Authorization': `Bearer ${SUPABASE_KEY!}`,
          'x-upsert':      'true',
          'Cache-Control': '3600',
        },
        body: blob,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn('Supabase save error:', res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('saveDataToCloud failed:', e);
    return false;
  }
}

export async function loadDataFromCloud(): Promise<{ data: EnergyData[]; fileName: string } | null> {
  if (!isCloudEnabled()) return null;
  try {
    // Public bucket — direct URL access (no auth needed)
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FILE}`;
    const res = await fetch(url + `?t=${Date.now()}`); // cache-bust
    if (!res.ok) return null;

    const payload: Payload = await res.json();
    if (!payload?.rows?.length) return null;

    return {
      fileName: payload.fileName,
      data: payload.rows.map(r => ({
        date:       new Date(r.date),
        produced:   r.produced,
        consumed:   r.consumed,
        exported:   r.exported,
        imported:   r.imported,
        charged:    r.charged,
        discharged: r.discharged,
      })),
    };
  } catch (e) {
    console.warn('loadDataFromCloud failed:', e);
    return null;
  }
}
