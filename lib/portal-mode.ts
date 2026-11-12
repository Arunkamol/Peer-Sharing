export type PortalMode = 'user' | 'provider';
const providerViews = new Set(['teaching', 'certificates', 'admin']);
const userViews = new Set(['discover', 'classes', 'resources', 'learning', 'purchases', 'saved']);
export function portalModeForView(view: string, current: PortalMode = 'user'): PortalMode {
  return providerViews.has(view) ? 'provider' : userViews.has(view) ? 'user' : current;
}
export function portalModeFromParams(params: URLSearchParams): PortalMode {
  return portalModeForView(params.get('view') || 'discover', params.get('mode') === 'provider' ? 'provider' : 'user');
}
