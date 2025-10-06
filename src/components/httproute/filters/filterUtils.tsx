import type {
  HTTPRouteFilter,
  RequestHeaderModifierFilter,
  ResponseHeaderModifierFilter,
  URLRewriteFilter,
  RequestRedirectFilter,
  RequestMirrorFilter,
  HeaderKV,
  HeaderNameOnly,
} from './filterTypes';

export const createDefaultFilter = (type: HTTPRouteFilter['type']): HTTPRouteFilter => {
  switch (type) {
    case 'RequestHeaderModifier':
      return { type: 'RequestHeaderModifier', requestHeaderModifier: {} };
    case 'ResponseHeaderModifier':
      return { type: 'ResponseHeaderModifier', responseHeaderModifier: {} };
    case 'URLRewrite':
      return { type: 'URLRewrite', urlRewrite: {} };
    case 'RequestRedirect':
      return { type: 'RequestRedirect', requestRedirect: { scheme: 'https', statusCode: 301 } };
    case 'RequestMirror':
      return { type: 'RequestMirror', requestMirror: { backendRef: { name: '' } } };
    default:
      return { type: 'RequestHeaderModifier', requestHeaderModifier: {} };
  }
};

export const generateFiltersForYAML = (filters: HTTPRouteFilter[]): HTTPRouteFilter[] => {
  if (!Array.isArray(filters) || filters.length === 0) return [];
  return filters
    .map((f) => {
      switch (f.type) {
        case 'RequestHeaderModifier': {
          const hm = f.requestHeaderModifier || {};
          const add = ((hm.add || []) as Array<{ id?: string; name: string; value: string }>)
            .filter((i) => (i.name || '').trim() && (i.value || '').trim())
            .map((i) => ({ name: i.name, value: i.value }));
          const set = ((hm.set || []) as Array<{ id?: string; name: string; value: string }>)
            .filter((i) => (i.name || '').trim() && (i.value || '').trim())
            .map((i) => ({ name: i.name, value: i.value }));
          const remove = ((hm.remove || []) as Array<string | { id?: string; name: string }>)
            .map((e) => (typeof e === 'string' ? e : e.name))
            .filter((s) => (s || '').trim());
          const next: RequestHeaderModifierFilter = { type: 'RequestHeaderModifier' } as const;
          if (add.length || set.length || remove.length) {
            const requestHeaderModifier: NonNullable<
              RequestHeaderModifierFilter['requestHeaderModifier']
            > = {};
            if (add.length) requestHeaderModifier.add = add;
            if (set.length) requestHeaderModifier.set = set;
            if (remove.length) requestHeaderModifier.remove = remove;
            (next as RequestHeaderModifierFilter).requestHeaderModifier = requestHeaderModifier;
          }
          return next as HTTPRouteFilter;
        }
        case 'ResponseHeaderModifier': {
          const hm = f.responseHeaderModifier || {};
          const add = ((hm.add || []) as Array<{ id?: string; name: string; value: string }>)
            .filter((i) => (i.name || '').trim() && (i.value || '').trim())
            .map((i) => ({ name: i.name, value: i.value }));
          const set = ((hm.set || []) as Array<{ id?: string; name: string; value: string }>)
            .filter((i) => (i.name || '').trim() && (i.value || '').trim())
            .map((i) => ({ name: i.name, value: i.value }));
          const remove = ((hm.remove || []) as Array<string | { id?: string; name: string }>)
            .map((e) => (typeof e === 'string' ? e : e.name))
            .filter((s) => (s || '').trim());
          const next: ResponseHeaderModifierFilter = { type: 'ResponseHeaderModifier' } as const;
          if (add.length || set.length || remove.length) {
            const responseHeaderModifier: NonNullable<
              ResponseHeaderModifierFilter['responseHeaderModifier']
            > = {};
            if (add.length) responseHeaderModifier.add = add;
            if (set.length) responseHeaderModifier.set = set;
            if (remove.length) responseHeaderModifier.remove = remove;
            (next as ResponseHeaderModifierFilter).responseHeaderModifier = responseHeaderModifier;
          }
          return next as HTTPRouteFilter;
        }
        case 'RequestRedirect': {
          const rr = f.requestRedirect || {};
          const next: RequestRedirectFilter = {
            type: 'RequestRedirect',
            requestRedirect: {},
          } as const;
          const scheme = (rr.scheme || '').trim();
          const hostname = (rr.hostname || '').trim();
          const port = typeof rr.port === 'number' ? rr.port : undefined;
          const statusCode = typeof rr.statusCode === 'number' ? rr.statusCode : undefined;
          if (scheme) next.requestRedirect.scheme = rr.scheme;
          if (hostname) next.requestRedirect.hostname = rr.hostname;
          if (port !== undefined) next.requestRedirect.port = port;
          if (statusCode !== undefined) next.requestRedirect.statusCode = statusCode;
          const path = rr.path || undefined;
          if (path && (path.type === 'ReplaceFullPath' || path.type === 'ReplacePrefixMatch')) {
            if (path.type === 'ReplaceFullPath' && (path.replaceFullPath || '').trim()) {
              next.requestRedirect.path = {
                type: 'ReplaceFullPath',
                replaceFullPath: path.replaceFullPath,
              };
            }
            if (path.type === 'ReplacePrefixMatch' && (path.replacePrefixMatch || '').trim()) {
              next.requestRedirect.path = {
                type: 'ReplacePrefixMatch',
                replacePrefixMatch: path.replacePrefixMatch,
              };
            }
          }
          if (Object.keys(next.requestRedirect).length === 0) {
            return { type: 'RequestRedirect' } as HTTPRouteFilter;
          }
          return next as HTTPRouteFilter;
        }
        case 'URLRewrite': {
          const url = f.urlRewrite || {};
          const next: URLRewriteFilter = { type: 'URLRewrite', urlRewrite: {} } as URLRewriteFilter;
          const hostname = (url.hostname || '').trim();
          const path = url.path || undefined;
          const urlRewrite: URLRewriteFilter['urlRewrite'] = {};
          if (hostname) urlRewrite.hostname = url.hostname;
          if (path && (path.type === 'ReplaceFullPath' || path.type === 'ReplacePrefixMatch')) {
            if (path.type === 'ReplaceFullPath' && (path.replaceFullPath || '').trim()) {
              urlRewrite.path = {
                type: 'ReplaceFullPath',
                replaceFullPath: path.replaceFullPath,
              };
            }
            if (path.type === 'ReplacePrefixMatch' && (path.replacePrefixMatch || '').trim()) {
              urlRewrite.path = {
                type: 'ReplacePrefixMatch',
                replacePrefixMatch: path.replacePrefixMatch,
              };
            }
          }
          if (Object.keys(urlRewrite).length > 0) next.urlRewrite = urlRewrite;
          return next as HTTPRouteFilter;
        }
        case 'RequestMirror': {
          const rm = f.requestMirror || { backendRef: {} };
          const backendRef = (rm.backendRef || {}) as { name?: string; port?: number };
          const name = (backendRef.name || '').trim();
          const port = typeof backendRef.port === 'number' ? backendRef.port : undefined;
          const next: RequestMirrorFilter = {
            type: 'RequestMirror',
            requestMirror: { backendRef: { name: '' } },
          } as RequestMirrorFilter;
          if (name) {
            next.requestMirror = { backendRef: { name } };
            if (port !== undefined) next.requestMirror.backendRef.port = port;
          }
          return next as HTTPRouteFilter;
        }
        default:
          return f;
      }
    })
    .filter(Boolean) as HTTPRouteFilter[];
};

export const getFilterSummary = (filter: HTTPRouteFilter) => {
  if (!filter) return '';
  switch (filter.type) {
    case 'RequestHeaderModifier':
    case 'ResponseHeaderModifier': {
      const hm =
        filter.type === 'RequestHeaderModifier'
          ? filter.requestHeaderModifier || {}
          : filter.responseHeaderModifier || {};
      const parts: string[] = [];
      if (Array.isArray(hm.add)) parts.push(`add:${hm.add.length}`);
      if (Array.isArray(hm.set)) parts.push(`set:${hm.set.length}`);
      if (hm.remove) parts.push(`remove:${hm.remove.length}`);
      return parts.length ? `${filter.type} — ${parts.join(' | ')}` : filter.type;
    }
    case 'URLRewrite': {
      const f = filter.urlRewrite || {};
      const parts: string[] = [];
      if (f.hostname) parts.push(`host → ${f.hostname}`);
      if (f.path?.type === 'ReplaceFullPath' && f.path.replaceFullPath)
        parts.push(`ReplaceFullPath → ${f.path.replaceFullPath}`);
      if (f.path?.type === 'ReplacePrefixMatch' && f.path.replacePrefixMatch)
        parts.push(`ReplacePrefixMatch → ${f.path.replacePrefixMatch}`);
      return parts.length ? `${filter.type} — ${parts.join(' | ')}` : filter.type;
    }
    case 'RequestRedirect': {
      const rr = filter.requestRedirect || {};
      const parts = [
        rr.scheme,
        rr.hostname,
        rr.port?.toString?.(),
        rr.statusCode?.toString?.(),
        rr.path?.type,
        rr.path?.replaceFullPath,
        rr.path?.replacePrefixMatch,
      ].filter(Boolean) as string[];
      return parts.length ? `${filter.type} — ${parts.join(' | ')}` : filter.type;
    }
    case 'RequestMirror': {
      const rm = filter.requestMirror || { backendRef: { name: '' } };
      const parts = [rm.backendRef.name, rm.backendRef.port?.toString?.()].filter(
        Boolean,
      ) as string[];
      return `${filter.type} — ${parts.join(' | ')}`;
    }
    default:
      return 'Filter';
  }
};

export const parseFiltersFromYAML = (filters: HTTPRouteFilter[] | undefined): HTTPRouteFilter[] => {
  if (!Array.isArray(filters) || filters.length === 0) return [];
  return filters.map((f, fi) => {
    if (!f || !('type' in f)) return f as HTTPRouteFilter;
    switch (f.type) {
      case 'RequestHeaderModifier': {
        const hm: NonNullable<RequestHeaderModifierFilter['requestHeaderModifier']> =
          (f as RequestHeaderModifierFilter).requestHeaderModifier || {};
        const add: HeaderKV[] = Array.isArray(hm.add)
          ? (hm.add as HeaderKV[]).map((i, iIdx) => ({
              id: i.id || `add-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const set: HeaderKV[] = Array.isArray(hm.set)
          ? (hm.set as HeaderKV[]).map((i, iIdx) => ({
              id: i.id || `set-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const remove: string[] = Array.isArray(hm.remove)
          ? (hm.remove as Array<string | HeaderNameOnly | undefined>)
              .map((e) => (typeof e === 'string' ? e : e?.name || ''))
              .filter((s) => s.trim())
          : [];
        const next: RequestHeaderModifierFilter = {
          type: 'RequestHeaderModifier',
          requestHeaderModifier: { add, set, remove },
        };
        return next;
      }
      case 'ResponseHeaderModifier': {
        const hm: NonNullable<ResponseHeaderModifierFilter['responseHeaderModifier']> =
          (f as ResponseHeaderModifierFilter).responseHeaderModifier || {};
        const add: HeaderKV[] = Array.isArray(hm.add)
          ? (hm.add as HeaderKV[]).map((i, iIdx) => ({
              id: i.id || `add-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const set: HeaderKV[] = Array.isArray(hm.set)
          ? (hm.set as HeaderKV[]).map((i, iIdx) => ({
              id: i.id || `set-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const remove: string[] = Array.isArray(hm.remove)
          ? (hm.remove as Array<string | HeaderNameOnly | undefined>)
              .map((e) => (typeof e === 'string' ? e : e?.name || ''))
              .filter((s) => s.trim())
          : [];
        const next: ResponseHeaderModifierFilter = {
          type: 'ResponseHeaderModifier',
          responseHeaderModifier: { add, set, remove },
        };
        return next;
      }
      case 'RequestRedirect': {
        const rr = (f as RequestRedirectFilter).requestRedirect || {};
        const obj: NonNullable<RequestRedirectFilter['requestRedirect']> = {};
        if (typeof rr.scheme === 'string') obj.scheme = rr.scheme;
        if (typeof rr.hostname === 'string') obj.hostname = rr.hostname;
        if (typeof rr.port === 'number') obj.port = rr.port;
        if (typeof rr.statusCode === 'number') obj.statusCode = rr.statusCode;
        if (
          rr.path &&
          (rr.path.type === 'ReplaceFullPath' || rr.path.type === 'ReplacePrefixMatch')
        ) {
          if (rr.path.type === 'ReplaceFullPath') {
            obj.path = { type: 'ReplaceFullPath', replaceFullPath: rr.path.replaceFullPath || '' };
          } else {
            obj.path = {
              type: 'ReplacePrefixMatch',
              replacePrefixMatch: rr.path.replacePrefixMatch || '',
            };
          }
        }
        const next: RequestRedirectFilter = { type: 'RequestRedirect', requestRedirect: obj };
        return next;
      }
      case 'URLRewrite': {
        const url = (f as URLRewriteFilter).urlRewrite || {};
        const obj: NonNullable<URLRewriteFilter['urlRewrite']> = {};
        if (typeof url.hostname === 'string') obj.hostname = url.hostname;
        if (
          url.path &&
          (url.path.type === 'ReplaceFullPath' || url.path.type === 'ReplacePrefixMatch')
        ) {
          if (url.path.type === 'ReplaceFullPath') {
            obj.path = { type: 'ReplaceFullPath', replaceFullPath: url.path.replaceFullPath || '' };
          } else {
            obj.path = {
              type: 'ReplacePrefixMatch',
              replacePrefixMatch: url.path.replacePrefixMatch || '',
            };
          }
        }
        const next: URLRewriteFilter = { type: 'URLRewrite', urlRewrite: obj };
        return next;
      }
      case 'RequestMirror': {
        const rm = (f as RequestMirrorFilter).requestMirror || { backendRef: { name: '' } };
        const backendRef = rm.backendRef || { name: '' };
        const next: RequestMirrorFilter = {
          type: 'RequestMirror',
          requestMirror: { backendRef: { name: backendRef.name || '' } },
        };
        if (typeof backendRef.port === 'number')
          next.requestMirror.backendRef.port = backendRef.port;
        return next;
      }
      default:
        return f as HTTPRouteFilter;
    }
  });
};

export const isFilterConfigValid = (f: HTTPRouteFilter): boolean => {
  switch (f.type) {
    case 'RequestHeaderModifier': {
      const hm = f.requestHeaderModifier || {};
      return Boolean(
        (hm.add && Object.keys(hm.add).length) ||
          (hm.set && Object.keys(hm.set).length) ||
          (hm.remove && hm.remove.length),
      );
    }
    case 'ResponseHeaderModifier': {
      const hm = f.responseHeaderModifier || {};
      return Boolean(
        (hm.add && Object.keys(hm.add).length) ||
          (hm.set && Object.keys(hm.set).length) ||
          (hm.remove && hm.remove.length),
      );
    }
    case 'RequestRedirect': {
      const rr = f.requestRedirect || {};
      const hasHostOrPort = Boolean((rr.hostname || '').trim?.() || rr.port);
      if (!rr.path) {
        return Boolean((rr.scheme || '').trim?.() || hasHostOrPort || rr.statusCode);
      }
      return Boolean(rr.path?.type && (rr.path.replaceFullPath || rr.path.replacePrefixMatch));
    }
    case 'URLRewrite': {
      const url = f.urlRewrite || {};
      return Boolean(
        (url.hostname || '').trim?.() ||
          (url.path?.type && (url.path.replaceFullPath || url.path.replacePrefixMatch)),
      );
    }
    case 'RequestMirror': {
      const rm = f.requestMirror || { backendRef: { name: '' } };
      return (rm.backendRef.name || '').trim().length > 0;
    }
    default:
      return true;
  }
};

export const validateFiltersStep = (filters: HTTPRouteFilter[]) => {
  if (!Array.isArray(filters) || filters.length === 0) return true;
  return filters.every(isFilterConfigValid);
};
