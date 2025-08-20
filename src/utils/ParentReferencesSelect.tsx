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
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

interface ParentReference {
  id: string;
  gatewayName: string;
  gatewayNamespace: string;
  sectionName: string;
  port: number;
}

interface Gateway {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    listeners?: Array<{
      name: string;
      port: number;
      protocol: string;
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

  // Get available sections for the selected Gateway
  const getAvailableSections = (gatewayName: string, gatewayNamespace: string) => {
    const gateway = availableGateways.find(
      (gw) => gw.metadata.name === gatewayName && gw.metadata.namespace === gatewayNamespace,
    );
    return gateway?.spec.listeners || [];
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
                    {availableGateways.map((gateway) => (
                      <FormSelectOption
                        key={`${gateway.metadata.name}-${gateway.metadata.namespace}`}
                        value={gateway.metadata.name}
                        label={`${gateway.metadata.name} (${gateway.metadata.namespace})`}
                      />
                    ))}
                  </FormSelect>
                </FormGroup>

                <FormGroup label={t('Namespace')} fieldId={`gateway-namespace-${parentRef.id}`}>
                  <TextInput
                    type="text"
                    id={`gateway-namespace-${parentRef.id}`}
                    value={parentRef.gatewayNamespace}
                    onChange={(_, value) =>
                      updateParentReference(parentRef.id, 'gatewayNamespace', value)
                    }
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
                    {getAvailableSections(parentRef.gatewayName, parentRef.gatewayNamespace).map(
                      (listener) => (
                        <FormSelectOption
                          key={listener.name}
                          value={listener.name}
                          label={`${listener.name} (${listener.protocol})`}
                        />
                      ),
                    )}
                  </FormSelect>
                </FormGroup>

                <FormGroup label={t('Port')} fieldId={`port-${parentRef.id}`}>
                  <TextInput
                    type="number"
                    id={`port-${parentRef.id}`}
                    value={parentRef.port.toString()}
                    onChange={(_, value) =>
                      updateParentReference(parentRef.id, 'port', parseInt(value) || 80)
                    }
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
