import { HTTPRouteMatch } from './MatchesTypes';
export const generateMatchesForYAML = (matches: HTTPRouteMatch[]) => {
  if (!matches || matches.length === 0) {
    return [];
  }

  return matches
    .map((match) => {
      const yamlMatch: any = {
        path: {
          type: match.pathType,
          value: match.pathValue,
        },
      };
      if (match.method && match.method !== 'GET') {
        yamlMatch.method = match.method;
      }

      if (match.headers && match.headers.length > 0) {
        const validHeaders = match.headers
          .filter((h) => h.name && h.value && h.name.trim() !== '' && h.value.trim() !== '')
          .map((h) => ({
            type: h.type,
            name: h.name,
            value: h.value,
          }));

        if (validHeaders.length > 0) {
          yamlMatch.headers = validHeaders;
        }
      }

      if (match.queryParams && match.queryParams.length > 0) {
        const validQueryParams = match.queryParams
          .filter((q) => q.name && q.value && q.name.trim() !== '' && q.value.trim() !== '')
          .map((q) => ({
            type: q.type,
            name: q.name,
            value: q.value,
          }));

        if (validQueryParams.length > 0) {
          yamlMatch.queryParams = validQueryParams;
        }
      }

      return yamlMatch;
    })
    .filter(Boolean);
};
export const parseMatchesFromYAML = (yamlMatches: any[]): HTTPRouteMatch[] => {
  if (!yamlMatches || !Array.isArray(yamlMatches)) {
    return [];
  }

  return yamlMatches.map((match: any, matchIndex: number) => ({
    id: `match-${Date.now()}-${matchIndex}`,
    pathType: match.path?.type || 'PathPrefix',
    pathValue: match.path?.value || '/',
    method: match.method || 'GET',
    headers: match.headers
      ? match.headers.map((header: any, headerIndex: number) => ({
          id: `header-${Date.now()}-${headerIndex}`,
          type: header.type || 'Exact',
          name: header.name || '',
          value: header.value || '',
        }))
      : [],
    queryParams: match.queryParams
      ? match.queryParams.map((queryParam: any, queryParamIndex: number) => ({
          id: `queryparam-${Date.now()}-${queryParamIndex}`,
          type: queryParam.type || 'Exact',
          name: queryParam.name || '',
          value: queryParam.value || '',
        }))
      : [],
  }));
};

export const validateMatchesInRule = (matches: HTTPRouteMatch[]): boolean => {
  return (
    matches.length === 0 ||
    matches.every((match) => match.pathType && match.pathValue && match.method)
  );
};

export const formatMatchesForDisplay = (matches: HTTPRouteMatch[]): string => {
  if (!matches || matches.length === 0) {
    return '—';
  }

  return matches
    .map((match) => `${match.pathType} ${match.pathValue} / ${match.method}`)
    .join(', ');
};
