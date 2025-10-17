import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export interface HTTPRouteBackendRef {
  id: string;
  serviceName: string;
  serviceNamespace: string;
  port: number;
  weight: number;
}

export interface K8sService extends K8sResourceCommon {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    ports: Array<{
      name?: string;
      port: number;
      protocol?: string;
      targetPort?: number | string;
    }>;
  };
}

export interface BackendReferencesWizardStepProps {
  currentRule: { backendRefs?: HTTPRouteBackendRef[] };
  setCurrentRule: (rule: any) => void;
  t: (key: string) => string;
}

export interface HTTPRouteBackendRefSpec {
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
  group?: string;
  kind?: string;
}
