import * as React from 'react';
import {
  Form,
  Button,
  TabContentBody,
  TabContent,
  Tooltip,
  Tabs,
  TabTitleText,
  Tab,
  FormGroup,
  TextInput,
  FormSelect,
  FormSelectOption,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  HTTPRouteBackendRef,
  BackendReferencesWizardStepProps,
  K8sService,
} from './BackendReferencesTypes';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

export const BackendReferencesWizardStep: React.FC<BackendReferencesWizardStepProps> = ({
  currentRule,
  setCurrentRule,
  t,
}) => {
  const [activeBackendTab, setActiveBackendTab] = React.useState(0);

  const [availableServices, setAvailableServices] = React.useState<K8sService[]>([]);

  // Load all available Services
  const serviceResource = {
    groupVersionKind: {
      group: '',
      version: 'v1',
      kind: 'Service',
    },
    isList: true,
  };

  const [serviceData, serviceLoaded, serviceError] =
    useK8sWatchResource<K8sService[]>(serviceResource);

  React.useEffect(() => {
    if (serviceLoaded && !serviceError && Array.isArray(serviceData)) {
      setAvailableServices(serviceData);
    }
  }, [serviceData, serviceLoaded, serviceError]);
  const handleAddBackendRef = () => {
    const newBackendRef: HTTPRouteBackendRef = {
      id: `backend-${Date.now().toString(36)}`,
      serviceName: '',
      serviceNamespace: '',
      port: 0,
      weight: 1,
    };

    const updatedBackendRefs = [...(currentRule.backendRefs || []), newBackendRef];
    setCurrentRule({
      ...currentRule,
      backendRefs: updatedBackendRefs,
    });

    setActiveBackendTab(updatedBackendRefs.length - 1);
  };

  const handleBackendTabSelect = (event: any, tabIndex: number) => {
    setActiveBackendTab(tabIndex);
  };

  // Remove backend reference
  const handleRemoveBackendRef = (backendIndex: number) => {
    const updatedBackendRefs = (currentRule.backendRefs || []).filter((_, i) => i !== backendIndex);
    setCurrentRule({
      ...currentRule,
      backendRefs: updatedBackendRefs,
    });

    // Adjust active tab
    if (activeBackendTab >= updatedBackendRefs.length && updatedBackendRefs.length > 0) {
      setActiveBackendTab(updatedBackendRefs.length - 1);
    } else if (updatedBackendRefs.length === 0) {
      setActiveBackendTab(0);
    }
  };

  const handleServiceChange = (backendIndex: number, serviceName: string) => {
    const selectedService = availableServices.find((s) => s.metadata.name === serviceName);

    const updatedBackendRefs = [...(currentRule.backendRefs || [])];
    updatedBackendRefs[backendIndex] = {
      ...updatedBackendRefs[backendIndex],
      serviceName,
      serviceNamespace: selectedService?.metadata.namespace || '',
      // Auto-select first available port
      port: selectedService?.spec.ports[0]?.port || 80,
    };

    setCurrentRule({
      ...currentRule,
      backendRefs: updatedBackendRefs,
    });
  };
  return (
    <Form>
      {/* Empty state */}
      {!currentRule.backendRefs || currentRule.backendRefs.length === 0 ? (
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ marginBottom: '16px', fontSize: '24px' }}>{t('Backend references')}</h1>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            {t(
              'Defines the backend Kubernetes Service(s) to forward traffic to. Traffic is load-balanced between them based on weight. If omitted, this rule will have no effect.',
            )}
          </p>
          <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddBackendRef}>
            {t('Add backend reference')}
          </Button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <h1 style={{ marginBottom: '16px', fontSize: '24px' }}>{t('Backend references')}</h1>
            <p style={{ marginBottom: '10px', color: '#666' }}>
              {t(
                'Defines the backend Kubernetes Service(s) to forward traffic to. Traffic is load-balanced between them based on weight.',
              )}
            </p>
          </div>

          <Tabs
            activeKey={activeBackendTab}
            onSelect={handleBackendTabSelect}
            onAdd={handleAddBackendRef}
          >
            {currentRule.backendRefs.map((backendRef, index) => (
              <Tab
                key={backendRef.id}
                eventKey={index}
                title={
                  <Tooltip
                    position="top"
                    content={
                      <div>
                        {backendRef.serviceName || 'empty'} {t('    |    ')}{' '}
                        {backendRef.port || 'empty'}
                        {t('  |  ')} {backendRef.weight || 'empty'}
                      </div>
                    }
                  >
                    <TabTitleText>Backend-{index + 1}</TabTitleText>
                  </Tooltip>
                }
                tabContentId={`backend-content-${index}`}
              />
            ))}
          </Tabs>

          {/* Tab Contents */}
          {currentRule.backendRefs.map((backendRef, index) => (
            <TabContent
              key={backendRef.id}
              eventKey={index}
              id={`backend-content-${index}`}
              activeKey={activeBackendTab}
              hidden={index !== activeBackendTab}
            >
              <TabContentBody style={{ padding: '16px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {/* Delete button */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '16px',
                      }}
                    >
                      <Tooltip
                        position={'left'}
                        content={<div>Delete backend reference permanently</div>}
                      >
                        <Button variant="secondary" onClick={() => handleRemoveBackendRef(index)}>
                          {t('Delete')}
                        </Button>
                      </Tooltip>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <FormGroup
                        label={t('Service Name')}
                        isRequired
                        fieldId={`service-name-${index}`}
                      >
                        <FormSelect
                          value={backendRef.serviceName}
                          onChange={(_, value) => handleServiceChange(index, value)}
                          aria-label={t('Select Service')}
                        >
                          <FormSelectOption key="empty" value="" label={t('Select Service')} />
                          {availableServices.map((service) => (
                            <FormSelectOption
                              key={`${service.metadata.name}-${service.metadata.namespace}`}
                              value={service.metadata.name}
                              label={`${service.metadata.name} (${service.metadata.namespace})`}
                            />
                          ))}
                        </FormSelect>
                      </FormGroup>

                      {/* Service Namespace */}
                      <FormGroup label={t('Namespace')} fieldId={`service-namespace-${index}`}>
                        <TextInput
                          value={backendRef.serviceNamespace}
                          isDisabled={true}
                          placeholder={t('Auto-filled from selected service')}
                        />
                      </FormGroup>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      {/* Port */}
                      <FormGroup label={t('Port')} fieldId={`service-prot-${index}`}>
                        <TextInput
                          value={backendRef.port}
                          isDisabled={true}
                          placeholder={t('Auto-filled from selected service')}
                        />
                      </FormGroup>

                      {/* Weight */}
                      <FormGroup label={t('Weight')} fieldId={`service-weight-${index}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Button
                            style={{ borderRadius: '7px' }}
                            variant="tertiary"
                            onClick={() => {
                              const newWeight = Math.max(1, backendRef.weight - 1);
                              const updatedBackendRefs = [...(currentRule.backendRefs || [])];
                              updatedBackendRefs[index] = { ...backendRef, weight: newWeight };
                              setCurrentRule({ ...currentRule, backendRefs: updatedBackendRefs });
                            }}
                            isDisabled={backendRef.weight <= 1}
                          >
                            -
                          </Button>
                          <TextInput
                            value={backendRef.weight.toString()}
                            onChange={(_, value) => {
                              const weight = Math.min(1000000, Math.max(1, parseInt(value) || 1));
                              const updatedBackendRefs = [...(currentRule.backendRefs || [])];
                              updatedBackendRefs[index] = { ...backendRef, weight };
                              setCurrentRule({ ...currentRule, backendRefs: updatedBackendRefs });
                            }}
                          />
                          <Button
                            style={{ borderRadius: '7px' }}
                            variant="tertiary"
                            onClick={() => {
                              const newWeight = Math.min(1000000, backendRef.weight + 1);
                              const updatedBackendRefs = [...(currentRule.backendRefs || [])];
                              updatedBackendRefs[index] = { ...backendRef, weight: newWeight };
                              setCurrentRule({ ...currentRule, backendRefs: updatedBackendRefs });
                            }}
                            isDisabled={backendRef.weight >= 1000000}
                          >
                            +
                          </Button>
                        </div>
                      </FormGroup>
                    </div>
                  </div>
                </div>
              </TabContentBody>
            </TabContent>
          ))}
        </div>
      )}
    </Form>
  );
};

// Export validation function
export const validateBackendReferencesStep = (currentRule: {
  backendRefs?: HTTPRouteBackendRef[];
}): boolean => {
  const backendRefs = currentRule.backendRefs || [];
  if (backendRefs.length === 0) {
    return true;
  }

  return backendRefs.every(
    (backendRef) =>
      backendRef.serviceName &&
      backendRef.serviceName !== '' &&
      backendRef.port &&
      backendRef.port > 0,
  );
};
