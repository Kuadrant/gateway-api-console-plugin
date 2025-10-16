import { HTTPRouteBackendRef, HTTPRouteBackendRefSpec } from './backendTypes';

export const generateBackendRefsForYAML = (
  backendRefs: HTTPRouteBackendRef[],
): HTTPRouteBackendRefSpec[] => {
  if (!backendRefs || backendRefs.length === 0) {
    return [];
  }

  return backendRefs
    .filter((ref) => ref.serviceName && ref.serviceName.trim() !== '' && ref.port > 0)
    .map((ref) => {
      const yamlBackendRef: HTTPRouteBackendRefSpec = {
        name: ref.serviceName,
        port: ref.port,
      };

      if (ref.serviceNamespace && ref.serviceNamespace.trim() !== '') {
        yamlBackendRef.namespace = ref.serviceNamespace;
      }

      if (ref.weight && ref.weight !== 1) {
        yamlBackendRef.weight = ref.weight;
      }

      return yamlBackendRef;
    })
    .filter(Boolean);
};

export const parseBackendRefsFromYAML = (backendRefs: any[]): HTTPRouteBackendRef[] => {
  if (!backendRefs || !Array.isArray(backendRefs)) {
    return [];
  }

  return backendRefs.map((ref, index) => ({
    id: `backend-${Date.now()}-${index}`,
    serviceName: ref.name || '',
    serviceNamespace: ref.namespace || '',
    port: ref.port || 0,
    weight: ref.weight || 1,
  }));
};

export const areBackendRefsValid = (backendRefs: HTTPRouteBackendRef[]): boolean => {
  if (!Array.isArray(backendRefs) || backendRefs.length === 0) return true;

  return backendRefs.every(
    (backendRef) =>
      backendRef.serviceName &&
      backendRef.serviceName !== '' &&
      backendRef.port &&
      backendRef.port > 0,
  );
};
