import type { Href } from 'expo-router';

// Notifications, AI suggested actions and message action tokens store web
// portal paths (e.g. `/patient/appointments/<id>`). This maps them onto the
// native route tree so every stored link opens the matching screen.
export function webPathToHref(path: string | null | undefined): Href | null {
  if (!path) return null;
  const clean =
    path
      .trim()
      .replace(/^https?:\/\/[^/]+/, '')
      .split('#')[0] ?? '';
  const [pathname = '', query = ''] = clean.split('?');
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (segments[0] === 'patient') segments.shift();
  const [section, id, sub] = segments;
  const params = new URLSearchParams(query);

  switch (section) {
    case undefined:
    case '':
    case 'dashboard':
      return '/';
    case 'appointments':
      if (id === 'book') {
        const reschedule = params.get('reschedule');
        const doctor = params.get('doctor');
        if (reschedule) return { pathname: '/book', params: { reschedule } };
        if (doctor) return { pathname: '/book', params: { doctor } };
        return '/book';
      }
      return id ? { pathname: '/appointment/[id]', params: { id } } : '/appointments';
    case 'telemedicine':
    case 'consultation':
      return id ? { pathname: '/visit/[id]', params: { id } } : '/appointments';
    case 'pre-visit':
      return id ? { pathname: '/pre-visit/[id]', params: { id } } : '/appointments';
    case 'messages':
      return id ? { pathname: '/conversation/[id]', params: { id } } : '/messages';
    case 'lab-results':
      return id ? { pathname: '/lab-results/[id]', params: { id } } : '/lab-results';
    case 'prescriptions':
      return id ? { pathname: '/prescriptions/[id]', params: { id } } : '/prescriptions';
    case 'imaging':
      return id ? { pathname: '/imaging/[id]', params: { id } } : '/imaging';
    case 'records':
      return '/records';
    case 'documents':
      return '/documents';
    case 'insurance':
      return '/insurance';
    case 'notifications':
      return '/notifications';
    case 'ai-chat':
    case 'ai':
      return '/assistant';
    case 'profile':
      return '/profile';
    case 'settings':
      return '/settings';
    default:
      return sub ? null : '/';
  }
}
