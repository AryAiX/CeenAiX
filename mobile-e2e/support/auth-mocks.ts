import type { Page } from '@playwright/test';

const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Stubs GoTrue endpoints that would send real SMS / email or create accounts. */
export async function mockAuthSideEffects(page: Page): Promise<void> {
  await page.route(/\/auth\/v1\/otp/, (route) => route.fulfill(json({})));
  await page.route(/\/auth\/v1\/recover/, (route) => route.fulfill(json({})));
  await page.route(/\/auth\/v1\/resend/, (route) => route.fulfill(json({})));
  await page.route(/\/auth\/v1\/verify/, (route) =>
    route.fulfill(json({ code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403))
  );
  await page.route(/\/auth\/v1\/signup/, (route) =>
    route.fulfill(
      json({
        id: '00000000-0000-4000-8000-0000000000a1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'qa.new.patient@ceenaix.test',
        phone: '',
        confirmation_sent_at: new Date().toISOString(),
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [{ identity_id: 'x', id: 'x', user_id: 'x', provider: 'email', identity_data: {} }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    )
  );
}
