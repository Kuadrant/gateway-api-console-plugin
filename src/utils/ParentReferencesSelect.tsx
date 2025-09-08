import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  FormSelect,
  FormSelectOption,
  TextInput,
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  FormFieldGroupExpandable,
  FormFieldGroupHeader,
} from '@patternfly/react-core';
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import { useK8sWatchResource, useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';

interface ParentReference {
  id: string;
  gatewayName: string;
  gatewayNamespace: string;
  sectionName: string;
  port: number;
}

// Extend Gateway interface for validation
interface Gateway {
  metadata: {
    name: string;
    namespace: string;
    deletionTimestamp?: string;
  };
  spec: {
    listeners?: Array<{
      name: string;
      port: number;
      protocol: string;
      allowedRoutes?: {
        namespaces?: {
          from?: 'All' | 'Same' | 'Selector';
        };
        kinds?: Array<{
          group?: string;
          kind: string;
        }>;
      };
    }>;
  };
  status?: {
    conditions?: Array<{
      type: string;
      status: string;
    }>;
    listeners?: Array<{
      name: string;
      conditions?: Array<{
        type: string;
        status: string;
      }>;
    }>;
  };
}

interface ParentReferencesSelectProps {
  parentRefs: ParentReference[];
  onChange: (parentRefs: ParentReference[]) => void;
  isDisabled?: boolean;
}

const ParentReferencesSelect: React.FC<ParentReferencesSelectProps> = ({
  parentRefs,
  onChange,
  isDisabled = false,
}) => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [availableGateways, setAvailableGateways] = React.useState<Gateway[]>([]);
  const [selectedNamespace] = useActiveNamespace();

  // Load all available Gateways
  const gatewayResource = {
    groupVersionKind: {
      group: 'gateway.networking.k8s.io',
      version: 'v1',
      kind: 'Gateway',
    },
    isList: true,
  };

  const [gatewayData, gatewayLoaded, gatewayError] =
    useK8sWatchResource<Gateway[]>(gatewayResource);

  React.useEffect(() => {
    if (gatewayLoaded && !gatewayError && Array.isArray(gatewayData)) {
      setAvailableGateways(gatewayData);
    }
  }, [gatewayData, gatewayLoaded, gatewayError]);

  // Gateway validation function
  const validateGateway = (gateway: Gateway): string | null => {
    // (1) Gateway exists → Gateway is deleting / Terminating
    if (gateway.metadata.deletionTimestamp) {
      return t('Gateway is terminating.');
    }

    // (2) Gateway exists → Route type is not supported
    const supportsHTTPRoute = gateway.spec.listeners?.some((listener) => {
      // Check allowedRoutes at the listener level
      const allowedKinds = listener.allowedRoutes?.kinds;
      if (allowedKinds && allowedKinds.length > 0) {
        return allowedKinds.some(
          (kind) =>
            kind.kind === 'HTTPRoute' &&
            (kind.group === 'gateway.networking.k8s.io' || !kind.group),
        );
      }
      // If allowedKinds are not specified, all types are supported by default for HTTP/HTTPS
      return listener.protocol === 'HTTP' || listener.protocol === 'HTTPS';
    });

    if (!supportsHTTPRoute) {
      return t('Only HTTPRoute is supported by this Gateway.');
    }

    // (3) Gateway exists → gateway allowedRoutes does not allow
    const allowsFromNamespace = gateway.spec.listeners?.some((listener) => {
      const namespacePolicy = listener.allowedRoutes?.namespaces?.from || 'Same';
      return (
        namespacePolicy === 'All' ||
        (namespacePolicy === 'Same' && gateway.metadata.namespace === selectedNamespace)
      );
    });

    if (!allowsFromNamespace) {
      return t('Not allowed by Gateway settings.');
    }

    return null; //  Gateway is available
  };

  // Listener validation function
  const validateListener = (gateway: Gateway, listenerName: string): string | null => {
    // First, validate the Gateway itself
    const gatewayValidation = validateGateway(gateway);
    if (gatewayValidation) return gatewayValidation;

    // (4) Listener is unavailable (Ready=False)
    const listenerStatus = gateway.status?.listeners?.find((ls) => ls.name === listenerName);
    if (listenerStatus) {
      const readyCondition = listenerStatus.conditions?.find((c) => c.type === 'Ready');
      if (readyCondition && readyCondition.status !== 'True') {
        return t('Listener is not available for route binding.');
      }
    }

    return null; // Listener is available
  };

  // Sort Gateways: available first, then unavailable
  const getSortedGateways = () => {
    return [...availableGateways].sort((a, b) => {
      const restrictionA = validateGateway(a);
      const restrictionB = validateGateway(b);

      // Available (without restriction) first
      if (!restrictionA && restrictionB) return -1;
      if (restrictionA && !restrictionB) return 1;

      // Within each group, sort by name
      return a.metadata.name.localeCompare(b.metadata.name);
    });
  };

  // Sort Listeners
  const getSortedSections = (gatewayName: string, gatewayNamespace: string) => {
    const gateway = availableGateways.find(
      (gw) => gw.metadata.name === gatewayName && gw.metadata.namespace === gatewayNamespace,
    );

    if (!gateway) return [];

    return [...(gateway.spec.listeners || [])].sort((a, b) => {
      const restrictionA = validateListener(gateway, a.name);
      const restrictionB = validateListener(gateway, b.name);
      if (!restrictionA && restrictionB) return -1;
      if (restrictionA && !restrictionB) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // Add new parent reference
  const addParentReference = () => {
    const newParentRef: ParentReference = {
      id: `parent-ref-${Date.now()}`,
      gatewayName: '',
      gatewayNamespace: '',
      sectionName: '',
      port: 0,
    };
    onChange([...parentRefs, newParentRef]);
  };

  // Remove parent reference
  const removeParentReference = (id: string) => {
    const updatedRefs = parentRefs.filter((ref) => ref.id !== id);
    onChange(updatedRefs);
  };

  // Update parent reference
  const updateParentReference = (
    id: string,
    field: keyof ParentReference,
    value: string | number,
  ) => {
    const updatedRefs = parentRefs.map((ref) => {
      if (ref.id === id) {
        const updatedRef = { ...ref, [field]: value };

        // If Gateway is changed, automatically update namespace and reset section
        if (field === 'gatewayName') {
          const selectedGateway = availableGateways.find((gw) => gw.metadata.name === value);
          if (selectedGateway) {
            updatedRef.gatewayNamespace = selectedGateway.metadata.namespace;
            updatedRef.sectionName = '';
            updatedRef.port = 80;
          }
        }

        // If Section is changed, update port
        if (field === 'sectionName') {
          const selectedGateway = availableGateways.find(
            (gw) =>
              gw.metadata.name === ref.gatewayName &&
              gw.metadata.namespace === ref.gatewayNamespace,
          );
          if (selectedGateway) {
            const listener = selectedGateway.spec.listeners?.find((l) => l.name === value);
            if (listener) {
              updatedRef.port = listener.port;
            }
          }
        }

        return updatedRef;
      }
      return ref;
    });
    onChange(updatedRefs);
  };

  // Validation check
  const hasValidParentRef = parentRefs.some((ref) => ref.gatewayName && ref.sectionName);

  return (
    <FormGroup
      label={
        <span>
          {t('Parent references')} <span style={{ color: 'red' }}>*</span>
        </span>
      }
      fieldId="parent-references"
    >
      {!hasValidParentRef && (
        <Alert
          variant={AlertVariant.warning}
          isInline
          title={t('At least one parent reference required for the HTTPRoute')}
          style={{ marginBottom: '16px' }}
        />
      )}

      {parentRefs.map((parentRef, index) => {
        const descriptionParts: string[] = [];
        if (parentRef.gatewayNamespace)
          descriptionParts.push(`${t('Namespace')}: ${parentRef.gatewayNamespace}`);
        if (parentRef.sectionName)
          descriptionParts.push(`${t('Section')}: ${parentRef.sectionName}`);
        if (parentRef.port) descriptionParts.push(`${t('Port')}: ${parentRef.port}`);
        const description = descriptionParts.length > 0 ? descriptionParts.join(' | ') : undefined;

        return (
          <FormFieldGroupExpandable
            key={parentRef.id}
            isExpanded
            toggleAriaLabel={t('Parent reference')}
            header={
              <FormFieldGroupHeader
                titleText={{
                  text: parentRef.gatewayName
                    ? `${parentRef.gatewayName}`
                    : `${t('Parent reference')}-${index + 1}`,
                  id: `parent-ref-${parentRef.id}`,
                }}
                titleDescription={description}
                actions={
                  !isDisabled && (
                    <Button
                      variant="plain"
                      onClick={() => removeParentReference(parentRef.id)}
                      aria-label={t('Remove parent reference')}
                      icon={<TrashIcon />}
                    />
                  )
                }
              />
            }
            style={{
              marginBottom: '16px',
              border: '1px solid #d2d2d2',
              borderRadius: '4px',
            }}
          >
            <div style={{ paddingRight: '16px' }}>
              {/* Gateway selection */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                <FormGroup
                  label={t('Gateway name')}
                  isRequired
                  fieldId={`gateway-name-${parentRef.id}`}
                >
                  <FormSelect
                    value={parentRef.gatewayName}
                    onChange={(_, value) =>
                      updateParentReference(parentRef.id, 'gatewayName', value)
                    }
                    aria-label={t('Select Gateway')}
                    isDisabled={isDisabled}
                  >
                    <FormSelectOption key="empty" value="" label={t('Select Gateway')} />
                    {getSortedGateways().map((gateway) => {
                      const restriction = validateGateway(gateway);

                      return (
                        <FormSelectOption
                          key={`${gateway.metadata.name}-${gateway.metadata.namespace}`}
                          value={gateway.metadata.name}
                          label={
                            restriction
                              ? `${gateway.metadata.name} (${gateway.metadata.namespace}) — ${restriction}`
                              : `${gateway.metadata.name} (${gateway.metadata.namespace})`
                          }
                          isDisabled={!!restriction}
                        />
                      );
                    })}
                  </FormSelect>
                </FormGroup>

                <FormGroup label={t('Namespace')} fieldId={`gateway-namespace-${parentRef.id}`}>
                  <TextInput
                    type="text"
                    id={`gateway-namespace-${parentRef.id}`}
                    value={parentRef.gatewayNamespace}
                    placeholder={t('Gateway Namespace')}
                    isDisabled
                  />
                </FormGroup>
              </div>

              {/* Section and Port */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <FormGroup label={t('Section name')} fieldId={`section-name-${parentRef.id}`}>
                  <FormSelect
                    value={parentRef.sectionName}
                    onChange={(_, value) =>
                      updateParentReference(parentRef.id, 'sectionName', value)
                    }
                    aria-label={t('Select Section')}
                    isDisabled={isDisabled || !parentRef.gatewayName}
                  >
                    <FormSelectOption key="empty" value="" label={t('Select Section')} />
                    {getSortedSections(parentRef.gatewayName, parentRef.gatewayNamespace).map(
                      (listener) => {
                        const gateway = availableGateways.find(
                          (gw) =>
                            gw.metadata.name === parentRef.gatewayName &&
                            gw.metadata.namespace === parentRef.gatewayNamespace,
                        );
                        const restriction = gateway
                          ? validateListener(gateway, listener.name)
                          : null;

                        return (
                          <FormSelectOption
                            key={listener.name}
                            value={listener.name}
                            label={
                              restriction
                                ? `${listener.name} (${listener.protocol}) — ${restriction}`
                                : `${listener.name} (${listener.protocol})`
                            }
                            isDisabled={!!restriction}
                          />
                        );
                      },
                    )}
                  </FormSelect>
                </FormGroup>

                <FormGroup label={t('Port')} fieldId={`port-${parentRef.id}`}>
                  <TextInput
                    type="number"
                    id={`port-${parentRef.id}`}
                    value={parentRef.port.toString()}
                    isDisabled
                  />
                </FormGroup>
              </div>
            </div>
          </FormFieldGroupExpandable>
        );
      })}

      {/* Add button */}
      {!isDisabled && (
        <Button
          variant={ButtonVariant.link}
          icon={<PlusCircleIcon />}
          onClick={addParentReference}
          isInline
          isDisabled={
            parentRefs.length > 0 &&
            (!parentRefs[parentRefs.length - 1]?.gatewayName ||
              !parentRefs[parentRefs.length - 1]?.sectionName)
          }
        >
          {t('Add parent reference')}
        </Button>
      )}

      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {t('Specifies the Gateway(s) this route should attach to. You can ')}
            <Button variant="link" isInline>
              {t('create gateway')}
            </Button>
            {t(' to connect.')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default ParentReferencesSelect;
