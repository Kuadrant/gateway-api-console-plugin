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
  Alert,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { HTTPRouteBackendRef, BackendReferencesWizardStepProps, K8sService } from './backendTypes';
import { useK8sWatchResource, useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';

export const BackendReferencesWizardStep: React.FC<BackendReferencesWizardStepProps> = ({
  currentRule,
  setCurrentRule,
  t,
}) => {
  const [activeBackendTab, setActiveBackendTab] = React.useState(0);
  const [currentNamespace] = useActiveNamespace();
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
      const filteredServices = serviceData.filter((s) => {
        const ns = s.metadata?.namespace || '';
        return (
          !ns.startsWith('openshift-') &&
          ns !== 'kube-system' &&
          ns !== 'kube-public' &&
          ns !== 'kube-node-lease'
        );
      });

      setAvailableServices(filteredServices);
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

  const handleServiceChange = (backendIndex: number, serviceKey: string) => {
    const [serviceName, serviceNamespace] = serviceKey.split(':');
    const selectedService = availableServices.find(
      (s) => s.metadata.name === serviceName && s.metadata.namespace === serviceNamespace,
    );

    const updatedBackendRefs = [...(currentRule.backendRefs || [])];
    updatedBackendRefs[backendIndex] = {
      ...updatedBackendRefs[backendIndex],
      serviceName,
      serviceNamespace: selectedService?.metadata.namespace || '',
      port: 0,
    };

    setCurrentRule({
      ...currentRule,
      backendRefs: updatedBackendRefs,
    });
  };

  const getAvailablePortsForService = (serviceName: string, serviceNamespace: string) => {
    if (!serviceName || !serviceNamespace) return [];

    const service = availableServices.find(
      (s) => s.metadata.name === serviceName && s.metadata.namespace === serviceNamespace,
    );

    return service?.spec.ports || [];
  };

  // Handle port selection
  const handlePortChange = (backendIndex: number, selectedPort: number) => {
    const updatedBackendRefs = [...(currentRule.backendRefs || [])];
    updatedBackendRefs[backendIndex] = {
      ...updatedBackendRefs[backendIndex],
      port: selectedPort,
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
                        {backendRef.serviceName || 'empty'} {'|'} {backendRef.port || 'empty'} {'|'}{' '}
                        {backendRef.weight || 'empty'}
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
                          value={`${backendRef.serviceName}:${backendRef.serviceNamespace}`}
                          onChange={(_, value) => handleServiceChange(index, value)}
                          aria-label={t('Select Service')}
                        >
                          <FormSelectOption key="empty" value="" label={t('Select Service')} />
                          {availableServices.map((service) => (
                            <FormSelectOption
                              key={`${service.metadata.name}-${service.metadata.namespace}`}
                              value={`${service.metadata.name}:${service.metadata.namespace}`}
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
                        {backendRef.serviceNamespace !== currentNamespace &&
                          backendRef.serviceName && (
                            <Alert
                              variant="warning"
                              isInline
                              isPlain
                              title="A ReferenceGrant will be required for this backend service"
                              style={{ marginTop: '5px' }}
                            />
                          )}
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
                      <FormGroup label={t('Port')} isRequired fieldId={`service-port-${index}`}>
                        <FormSelect
                          value={backendRef.port.toString()}
                          onChange={(_, value) => handlePortChange(index, parseInt(value))}
                          aria-label={t('Select Port')}
                          isDisabled={!backendRef.serviceName}
                        >
                          <FormSelectOption key="empty" value="" label={t('Select Port')} />
                          {getAvailablePortsForService(
                            backendRef.serviceName,
                            backendRef.serviceNamespace,
                          ).map((port) => (
                            <FormSelectOption
                              key={port.port}
                              value={port.port.toString()}
                              label={
                                port.name ? `${port.port} (${port.name})` : port.port.toString()
                              }
                            />
                          ))}
                        </FormSelect>
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

export default BackendReferencesWizardStep;
