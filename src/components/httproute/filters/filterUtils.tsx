import { HTTPRouteFilter } from './filterTypes';

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
          const next: any = { type: 'RequestHeaderModifier' };
          if (add.length || set.length || remove.length) {
            next.requestHeaderModifier = {};
            if (add.length) next.requestHeaderModifier.add = add;
            if (set.length) next.requestHeaderModifier.set = set;
            if (remove.length) next.requestHeaderModifier.remove = remove;
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
          const next: any = { type: 'ResponseHeaderModifier' };
          if (add.length || set.length || remove.length) {
            next.responseHeaderModifier = {};
            if (add.length) next.responseHeaderModifier.add = add;
            if (set.length) next.responseHeaderModifier.set = set;
            if (remove.length) next.responseHeaderModifier.remove = remove;
          }
          return next as HTTPRouteFilter;
        }
        case 'RequestRedirect': {
          const rr = f.requestRedirect || {};
          const next: any = { type: 'RequestRedirect', requestRedirect: {} };
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
            delete next.requestRedirect;
          }
          return next as HTTPRouteFilter;
        }
        case 'URLRewrite': {
          const ur = f.urlRewrite || {};
          const next: any = { type: 'URLRewrite' };
          const hostname = (ur.hostname || '').trim();
          const path = ur.path || undefined;
          const urlRewrite: any = {};
          if (hostname) urlRewrite.hostname = ur.hostname;
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
          const next: any = { type: 'RequestMirror' };
          if (name) {
            next.requestMirror = { backendRef: { name } } as any;
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
    if (!f || !('type' in f)) return f as any;
    switch (f.type) {
      case 'RequestHeaderModifier': {
        const hm = (f as any).requestHeaderModifier || {};
        const add = Array.isArray(hm.add)
          ? (hm.add as Array<{ id?: string; name?: string; value?: string }>).map((i, iIdx) => ({
              id: i.id || `add-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const set = Array.isArray(hm.set)
          ? (hm.set as Array<{ id?: string; name?: string; value?: string }>).map((i, iIdx) => ({
              id: i.id || `set-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const remove = Array.isArray(hm.remove)
          ? (hm.remove as Array<string | { id?: string; name?: string } | undefined>).map((e, iIdx) =>
              typeof e === 'string'
                ? { id: `del-${fi}-${iIdx}-${Date.now()}`, name: e || '' }
                : { id: e?.id || `del-${fi}-${iIdx}-${Date.now()}`, name: e?.name || '' },
            )
          : [];
        const next: any = { type: 'RequestHeaderModifier', requestHeaderModifier: {} };
        next.requestHeaderModifier.add = add;
        next.requestHeaderModifier.set = set;
        next.requestHeaderModifier.remove = remove;
        return next as HTTPRouteFilter;
      }
      case 'ResponseHeaderModifier': {
        const hm = (f as any).responseHeaderModifier || {};
        const add = Array.isArray(hm.add)
          ? (hm.add as Array<{ id?: string; name?: string; value?: string }>).map((i, iIdx) => ({
              id: i.id || `add-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const set = Array.isArray(hm.set)
          ? (hm.set as Array<{ id?: string; name?: string; value?: string }>).map((i, iIdx) => ({
              id: i.id || `set-${fi}-${iIdx}-${Date.now()}`,
              name: i.name || '',
              value: i.value || '',
            }))
          : [];
        const remove = Array.isArray(hm.remove)
          ? (hm.remove as Array<string | { id?: string; name?: string } | undefined>).map((e, iIdx) =>
              typeof e === 'string'
                ? { id: `del-${fi}-${iIdx}-${Date.now()}`, name: e || '' }
                : { id: e?.id || `del-${fi}-${iIdx}-${Date.now()}`, name: e?.name || '' },
            )
          : [];
        const next: any = { type: 'ResponseHeaderModifier', responseHeaderModifier: {} };
        next.responseHeaderModifier.add = add;
        next.responseHeaderModifier.set = set;
        next.responseHeaderModifier.remove = remove;
        return next as HTTPRouteFilter;
      }
      case 'RequestRedirect': {
        const rr = (f as any).requestRedirect || {};
        const next: any = { type: 'RequestRedirect' };
        const obj: any = {};
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
            obj.path = { type: 'ReplacePrefixMatch', replacePrefixMatch: rr.path.replacePrefixMatch || '' };
          }
        }
        next.requestRedirect = obj;
        return next as HTTPRouteFilter;
      }
      case 'URLRewrite': {
        const ur = (f as any).urlRewrite || {};
        const next: any = { type: 'URLRewrite' };
        const obj: any = {};
        if (typeof ur.hostname === 'string') obj.hostname = ur.hostname;
        if (ur.path && (ur.path.type === 'ReplaceFullPath' || ur.path.type === 'ReplacePrefixMatch')) {
          if (ur.path.type === 'ReplaceFullPath') {
            obj.path = { type: 'ReplaceFullPath', replaceFullPath: ur.path.replaceFullPath || '' };
          } else {
            obj.path = { type: 'ReplacePrefixMatch', replacePrefixMatch: ur.path.replacePrefixMatch || '' };
          }
        }
        next.urlRewrite = obj;
        return next as HTTPRouteFilter;
      }
      case 'RequestMirror': {
        const rm = (f as any).requestMirror || {};
        const backendRef = rm.backendRef || {};
        const next: any = { type: 'RequestMirror', requestMirror: { backendRef: {} } };
        next.requestMirror.backendRef.name = backendRef.name || '';
        if (typeof backendRef.port === 'number') next.requestMirror.backendRef.port = backendRef.port;
        return next as HTTPRouteFilter;
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
      const ur = f.urlRewrite || {};
      return Boolean(
        (ur.hostname || '').trim?.() ||
          (ur.path?.type && (ur.path.replaceFullPath || ur.path.replacePrefixMatch)),
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
