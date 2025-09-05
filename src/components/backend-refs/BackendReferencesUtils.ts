import { HTTPRouteBackendRef } from './BackendReferencesTypes';

export const generateBackendRefsForYAML = (backendRefs: HTTPRouteBackendRef[]) => {
  if (!backendRefs || backendRefs.length === 0) {
    return [];
  }

  return backendRefs
    .filter((ref) => ref.serviceName && ref.serviceName.trim() !== '' && ref.port > 0)
    .map((ref) => {
      const yamlBackendRef: any = {
        name: ref.serviceName,
        port: ref.port,
      };

      // Only include namespace if it's different from current namespace
      if (ref.serviceNamespace && ref.serviceNamespace.trim() !== '') {
        yamlBackendRef.namespace = ref.serviceNamespace;
      }

      // Only include weight if it's not default
      if (ref.weight && ref.weight !== 1) {
        yamlBackendRef.weight = ref.weight;
      }

      return yamlBackendRef;
    })
    .filter(Boolean);
};

export const parseBackendRefsFromYAML = (yamlBackendRefs: any[]): HTTPRouteBackendRef[] => {
  if (!yamlBackendRefs || !Array.isArray(yamlBackendRefs)) {
    return [];
  }

  return yamlBackendRefs.map((ref: any, index: number) => ({
    id: `backend-ref-${Date.now()}-${index}`,
    serviceName: ref.name || '',
    serviceNamespace: ref.namespace || '',
    port: ref.port || 80,
    weight: ref.weight || 1,
  }));
};

export const validateBackendRefsInRule = (backendRefs: HTTPRouteBackendRef[]): boolean => {
  return (
    backendRefs.length === 0 ||
    backendRefs.every((ref) => ref.serviceName && ref.serviceName.trim() !== '' && ref.port > 0)
  );
};
