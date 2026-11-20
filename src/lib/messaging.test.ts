import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import {
  buildMessageActionPath,
  getMessagePreviewText,
  parseMessageBodyParts,
  safeMessageActionPath,
  serializeMessageBodyParts,
} from './messaging';

const chip = (kind: string, href: string) =>
  `[[ceenaix-action:${encodeURIComponent(JSON.stringify({ kind, href }))}]]`;

describe('message chip links (QA-152)', () => {
  it('only allows the three patient pages, as paths inside the app', () => {
    expect(safeMessageActionPath('records_link', '/patient/records')).toBe('/patient/records');
    expect(safeMessageActionPath('appointments_link', '/patient/appointments/')).toBe('/patient/appointments');
    expect(safeMessageActionPath('booking_link', '/patient/appointments/book?doctor=d1&source=message')).toBe(
      '/patient/appointments/book?doctor=d1&source=message'
    );
  });

  it('keeps old chips that were saved with the sender address, but drops the address', () => {
    expect(safeMessageActionPath('records_link', 'http://192.168.1.20:5173/patient/records')).toBe('/patient/records');
    expect(safeMessageActionPath('booking_link', 'https://app.ceenaix.com/patient/appointments/book?doctor=d1&evil=1')).toBe(
      '/patient/appointments/book?doctor=d1'
    );
  });

  it('refuses anything else', () => {
    expect(safeMessageActionPath('records_link', 'javascript:alert(1)')).toBeNull();
    expect(safeMessageActionPath('records_link', 'data:text/html,<h1>x</h1>')).toBeNull();
    expect(safeMessageActionPath('booking_link', 'https://evil.example/login')).toBeNull();
    expect(safeMessageActionPath('records_link', '//evil.example/patient/records')).toBeNull();
    expect(safeMessageActionPath('records_link', '/patient/appointments')).toBeNull();
    expect(safeMessageActionPath('appointments_link', '/admin/users')).toBeNull();
    expect(safeMessageActionPath('records_link', '   ')).toBeNull();
  });

  it('never turns a forged chip into a clickable link', async () => {
    await i18n.changeLanguage('en');
    const parts = parseMessageBodyParts(`Please sign in again ${chip('booking_link', 'https://evil.example/login')}`);
    expect(parts.some((part) => part.type === 'action')).toBe(false);
    expect(parts.map((part) => (part.type === 'text' ? part.value : '')).join('')).toBe('Please sign in again [Link removed]');
    expect(getMessagePreviewText(chip('records_link', 'javascript:alert(1)'))).toBe('[Link removed]');
  });

  it('turns a genuine chip into an in-app link', () => {
    const parts = parseMessageBodyParts(`Your records ${chip('records_link', 'http://localhost:5173/patient/records')}`);
    expect(parts).toEqual([
      { type: 'text', value: 'Your records ' },
      { type: 'action', action: { kind: 'records_link', href: '/patient/records' } },
    ]);
  });

  it('builds new chips as paths, which survive a round trip', () => {
    expect(buildMessageActionPath('booking_link', 'doc 1')).toBe('/patient/appointments/book?doctor=doc%201&source=message');
    expect(buildMessageActionPath('records_link')).toBe('/patient/records');
    const body = serializeMessageBodyParts([
      { type: 'action', action: { kind: 'booking_link', href: buildMessageActionPath('booking_link', 'd1') } },
    ]);
    expect(parseMessageBodyParts(body)).toEqual([
      { type: 'action', action: { kind: 'booking_link', href: '/patient/appointments/book?doctor=d1&source=message' } },
    ]);
  });
});
