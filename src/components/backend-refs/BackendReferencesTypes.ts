export interface HTTPRouteBackendRef {
  id: string;
  serviceName: string;
  serviceNamespace: string;
  port: number;
  weight: number;
}

export interface BackendReferencesWizardStepProps {
  currentRule: {
    backendRefs?: HTTPRouteBackendRef[];
  };
  setCurrentRule: (rule: any) => void;
  t: (key: string) => string;
}
export interface K8sService {
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
