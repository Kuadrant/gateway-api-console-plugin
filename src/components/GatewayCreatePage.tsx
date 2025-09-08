import * as React from 'react';
import Helmet from 'react-helmet';
import {
  PageSection,
  Title,
  Form,
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  FormSelect,
  FormSelectOption,
  Button,
  Popover,
  Modal,
  Wizard,
  WizardStep,
  Radio,
  Alert,
  Spinner,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import {
  HelpIcon,
  PlusCircleIcon,
  TrashIcon,
  EditIcon,
  AngleDownIcon,
  AngleRightIcon,
} from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import {
  ResourceYAMLEditor,
  useActiveNamespace,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as yaml from 'js-yaml';
import GatewayApiCreateUpdate from './GatewayApiCreateUpdate';
import { useLocation } from 'react-router';
import { GatewayResource } from './gateway/GatewayModel';
import {
  generateUniqueId,
  removeCertsAndTlsOptionsForPassthrough,
} from '../utils/gatewayCreateEditHelpers';
import './css/gateway-api-plugin.css';

const GatewayCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [createView, setCreateView] = React.useState<'form' | 'yaml'>('form');
  const [selectedNamespace] = useActiveNamespace();
  const [create, setCreate] = React.useState(true);
  const [originalMetadata, setOriginalMetadata] = React.useState<any>(null);

  // Gateway settings
  const [gatewayName, setGatewayName] = React.useState('');
  const [gatewayClassName, setGatewayClassName] = React.useState('istio');

  // YAML editor
  const [yamlContent, setYamlContent] = React.useState<any>(null);

  const location = useLocation();
  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[5];
  const namespaceEdit = pathSplit[3];

  // Modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [listeners, setListeners] = React.useState<any[]>([]);
  const [editingListenerIndex, setEditingListenerIndex] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [yamlError, setYamlError] = React.useState<string | null>(null);

  // Addresses settings
  const [addresses, setAddresses] = React.useState<any[]>([]);
  const [isAddressesExpanded, setIsAddressesExpanded] = React.useState(false);

  // Prefilled data for listener fields (temporary data)
  const [currentListener, setCurrentListener] = React.useState({
    name: '',
    protocol: 'HTTP',
    port: 80,
    hostname: '',
    tlsMode: 'Terminate',
    tlsOptions: [],
    certificateRefs: [],
    allowedRoutes: {
      namespaces: {
        from: 'Same',
      },
      kinds: [],
    },
  });

  let gatewayResource = null;
  if (nameEdit) {
    gatewayResource = {
      groupVersionKind: {
        group: 'gateway.networking.k8s.io',
        version: 'v1',
        kind: 'Gateway',
      },
      name: nameEdit,
      namespace: namespaceEdit,
      isList: false,
    };
  }

  const [gatewayData, gatewayLoaded, gatewayError] = gatewayResource
    ? useK8sWatchResource(gatewayResource)
    : [null, false, null];

  const handleGatewayClassChange = (event: React.FormEvent<HTMLSelectElement>) => {
    setGatewayClassName(event.currentTarget.value);
  };

  const handleAddListener = () => {
    setEditingListenerIndex(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingListenerIndex(null);
    setCurrentListener({
      name: '',
      protocol: 'HTTP',
      port: 80,
      hostname: '',
      tlsMode: 'Terminate',
      tlsOptions: [],
      certificateRefs: [],
      allowedRoutes: {
        namespaces: {
          from: 'Same',
        },
        kinds: [],
      },
    });
  };

  const gatewayModel = {
    apiGroup: 'gateway.networking.k8s.io',
    apiVersion: 'v1',
    kind: 'Gateway',
    plural: 'gateways',
  };

  const handleListenerSave = () => {
    // Remove certificates and TLS options when TLS mode is Passthrough
    const reformattedListener = removeCertsAndTlsOptionsForPassthrough(currentListener);

    let newListeners;
    if (editingListenerIndex !== null) {
      newListeners = [...listeners];
      newListeners[editingListenerIndex] = { ...reformattedListener };
    } else {
      newListeners = [...listeners, { ...reformattedListener }];
    }
    setListeners(newListeners);
    handleModalClose();
    console.log('Updated listeners:', newListeners);
  };

  const handleRemoveListener = (index: number) => {
    const newListeners = listeners.filter((_, i) => i !== index);
    setListeners(newListeners);
  };

  const handleEditListener = (index: number) => {
    const listener = listeners[index];
    setCurrentListener({
      ...listener,
      certificateRefs: listener.certificateRefs || [],
      tlsOptions: listener.tlsOptions || [],
      allowedRoutes: {
        namespaces: {
          from: listener.allowedRoutes?.namespaces?.from || 'Same',
        },
        kinds: listener.allowedRoutes?.kinds || [],
      },
    });
    setEditingListenerIndex(index);
    setIsModalOpen(true);
  };

  const handleAddCertificateRef = () => {
    const newRef = {
      id: generateUniqueId('cert'),
      name: '',
      namespace: selectedNamespace,
      kind: 'Secret',
    };
    setCurrentListener({
      ...currentListener,
      certificateRefs: [...currentListener.certificateRefs, newRef],
    });
  };

  const handleCertificateRefChange = (id: number, field: string, value: string) => {
    setCurrentListener({
      ...currentListener,
      certificateRefs: currentListener.certificateRefs.map((ref) =>
        ref.id === id ? { ...ref, [field]: value } : ref,
      ),
    });
  };

  const handleRemoveCertificateRef = (id: number) => {
    setCurrentListener({
      ...currentListener,
      certificateRefs: currentListener.certificateRefs.filter((ref) => ref.id !== id),
    });
  };

  const handleAddRouteKind = () => {
    const newKind = {
      id: generateUniqueId('route'),
      kind: 'HTTPRoute',
      group: 'gateway.networking.k8s.io',
    };
    setCurrentListener({
      ...currentListener,
      allowedRoutes: {
        ...currentListener.allowedRoutes,
        kinds: [...currentListener.allowedRoutes.kinds, newKind],
      },
    });
  };

  const handleRouteKindChange = (id: number, field: string, value: string) => {
    setCurrentListener({
      ...currentListener,
      allowedRoutes: {
        ...currentListener.allowedRoutes,
        kinds: currentListener.allowedRoutes.kinds.map((kind) =>
          kind.id === id ? { ...kind, [field]: value } : kind,
        ),
      },
    });
  };

  const handleRemoveRouteKind = (id: number) => {
    setCurrentListener({
      ...currentListener,
      allowedRoutes: {
        ...currentListener.allowedRoutes,
        kinds: currentListener.allowedRoutes.kinds.filter((kind) => kind.id !== id),
      },
    });
  };

  const handleAddTlsOption = () => {
    const newOption = {
      id: generateUniqueId('tls'),
      key: '',
      value: '',
    };
    setCurrentListener({
      ...currentListener,
      tlsOptions: [...currentListener.tlsOptions, newOption],
    });
  };

  const handleTlsOptionChange = (id: number, field: string, value: string) => {
    setCurrentListener({
      ...currentListener,
      tlsOptions: currentListener.tlsOptions.map((option) =>
        option.id === id ? { ...option, [field]: value } : option,
      ),
    });
  };

  const handleRemoveTlsOption = (id: number) => {
    setCurrentListener({
      ...currentListener,
      tlsOptions: currentListener.tlsOptions.filter((option) => option.id !== id),
    });
  };

  // Address handlers
  const handleAddAddress = () => {
    const newAddress = {
      id: generateUniqueId('addr'),
      type: 'IPAddress',
      value: '',
    };
    setAddresses([...addresses, newAddress]);
  };

  const handleAddressChange = (id: number, field: string, value: string) => {
    setAddresses(
      addresses.map((address) => (address.id === id ? { ...address, [field]: value } : address)),
    );
  };

  const handleRemoveAddress = (id: number) => {
    setAddresses(addresses.filter((address) => address.id !== id));
  };

  // When form completed, build gateway resource object from form data
  const gatewayObject = React.useMemo(() => {
    const gateway = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'Gateway',
      metadata: originalMetadata
        ? {
            ...originalMetadata,
          }
        : {
            name: gatewayName,
            namespace: selectedNamespace,
          },
      spec: {
        gatewayClassName: gatewayClassName,
        listeners: listeners.map((listener) => {
          const formattedListener: any = {
            name: listener.name,
            port: listener.port,
            protocol: listener.protocol,
          };

          if (listener.hostname) {
            formattedListener.hostname = listener.hostname;
          }

          if (listener.protocol === 'HTTPS' || listener.protocol === 'TLS') {
            formattedListener.tls = {
              mode: listener.tlsMode,
            };

            if (listener.certificateRefs && listener.certificateRefs.length > 0) {
              formattedListener.tls.certificateRefs = listener.certificateRefs.map((ref) => ({
                name: ref.name,
                namespace: ref.namespace || undefined,
                kind: ref.kind,
              }));
            }

            if (listener.tlsOptions && listener.tlsOptions.length > 0) {
              formattedListener.tls.options = listener.tlsOptions.reduce((acc, option) => {
                acc[option.key] = option.value;
                return acc;
              }, {});
            }
          }

          if (listener.allowedRoutes) {
            formattedListener.allowedRoutes = {
              namespaces: {
                from: listener.allowedRoutes.namespaces.from,
              },
            };

            if (listener.allowedRoutes.kinds && listener.allowedRoutes.kinds.length > 0) {
              formattedListener.allowedRoutes.kinds = listener.allowedRoutes.kinds.map((kind) => ({
                kind: kind.kind,
                group: kind.group,
              }));
            }
          }

          return formattedListener;
        }),
      },
    };

    if (addresses.length > 0) {
      (gateway.spec as any).addresses = addresses.map((address) => ({
        type: address.type,
        value: address.value,
      }));
    }

    return gateway;
  }, [gatewayName, gatewayClassName, listeners, addresses, selectedNamespace, originalMetadata]);

  const populateFormFromGateway = (gateway: any) => {
    try {
      if (gateway.metadata?.name) {
        setGatewayName(gateway.metadata.name);
      }

      if (gateway.spec?.gatewayClassName) {
        setGatewayClassName(gateway.spec.gatewayClassName);
      }

      if (gateway.spec?.listeners) {
        const formattedListeners = gateway.spec.listeners.map((listener: any, index: number) => ({
          name: listener.name || '',
          port: listener.port || 80,
          protocol: listener.protocol || 'HTTP',
          hostname: listener.hostname || '',
          tlsMode: listener.tls?.mode || 'Terminate',
          tlsOptions: listener.tls?.options
            ? Object.entries(listener.tls.options).map(([key, value], idx) => ({
                id: generateUniqueId(`tls_${index}_${idx}`),
                key,
                value,
              }))
            : [],
          certificateRefs: listener.tls?.certificateRefs
            ? listener.tls.certificateRefs.map((ref: any, idx: number) => ({
                id: generateUniqueId(`cert_${index}_${idx}`),
                name: ref.name || '',
                namespace: ref.namespace || '',
                kind: ref.kind || 'Secret',
              }))
            : [],
          allowedRoutes: {
            namespaces: {
              from: listener.allowedRoutes?.namespaces?.from || 'Same',
            },
            kinds: listener.allowedRoutes?.kinds
              ? listener.allowedRoutes.kinds.map((kind: any, idx: number) => ({
                  id: generateUniqueId(`route_${index}_${idx}`),
                  kind: kind.kind || 'HTTPRoute',
                  group: kind.group || 'gateway.networking.k8s.io',
                }))
              : [],
          },
        }));
        setListeners(formattedListeners);
      }

      if (gateway.spec?.addresses) {
        const formattedAddresses = gateway.spec.addresses.map((address: any, index: number) => ({
          id: generateUniqueId(`addr_${index}`),
          type: address.type || 'IPAddress',
          value: address.value || '',
        }));
        setAddresses(formattedAddresses);
      }
    } catch (error) {
      console.error('Error populating form from gateway:', error);
    }
  };

  React.useEffect(() => {
    if (nameEdit) {
      setIsLoading(true);
    }
    if (gatewayLoaded && !gatewayError) {
      if (!Array.isArray(gatewayData)) {
        const gatewayUpdate = gatewayData as GatewayResource;
        console.log('gatewayUpdate', gatewayUpdate);
        setCreate(false);
        setOriginalMetadata(gatewayUpdate.metadata);
        populateFormFromGateway(gatewayUpdate);
        setYamlContent(gatewayUpdate);
        setIsLoading(false);
      }
    } else if (gatewayError) {
      console.error('Failed to fetch the resource:', gatewayError);
      setIsLoading(false);
    }
  }, [gatewayData, gatewayLoaded, gatewayError]);

  React.useEffect(() => {
    try {
      setYamlContent(gatewayObject);
    } catch (error) {
      console.error('Error converting form data to YAML:', error);
    }
  }, [gatewayObject]);

  // Handle YAML changes and sync to form
  const handleYamlChange = (yamlInput: string) => {
    setYamlContent(yamlInput);
    setYamlError(null);
    try {
      const parsedGateway = yaml.load(yamlInput);
      if (parsedGateway && typeof parsedGateway === 'object') {
        populateFormFromGateway(parsedGateway);
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        'Invalid YAML syntax. Please review the Gateway Resource YAML and try again.';
      setYamlError(errorMessage);
      console.warn('Invalid YAML syntax, not updating form:', error);
    }
  };

  const formValidation = () => {
    let isFormValid = false;

    if (
      gatewayName &&
      gatewayName.trim() !== '' &&
      gatewayClassName &&
      gatewayClassName !== '' &&
      listeners &&
      listeners.length > 0 &&
      listeners.every(
        (listener) =>
          listener.name &&
          listener.name.trim() !== '' &&
          listener.port > 0 &&
          listener.certificateRefs.every((ref) => ref.name !== '') &&
          listener.port <= 65535 &&
          (!(listener.protocol === 'HTTPS' || listener.protocol === 'TLS') ||
            listener.tlsMode !== 'Terminate' ||
            listener.certificateRefs.length > 0),
      ) &&
      (!addresses ||
        addresses.length === 0 ||
        addresses.every((address) => address.value && address.value.trim() !== ''))
    ) {
      isFormValid = true;
    }
    return isFormValid;
  };

  const wizardSteps = [
    {
      name: t('Configuration'),
      nextButtonText: t('Next'),
      form: (
        <Form>
          <FormGroup label={t('Listener Name')} isRequired fieldId="listener-name">
            <TextInput
              type="text"
              id="listener-name"
              value={currentListener.name}
              onChange={(_event, value) => setCurrentListener({ ...currentListener, name: value })}
              isRequired
              placeholder={t('Enter listener name')}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('A unique name for this listener within the gateway.')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label={t('Port')} isRequired fieldId="listener-port">
            <TextInput
              type="number"
              value={currentListener.port}
              onChange={(_event, value) =>
                setCurrentListener({ ...currentListener, port: parseInt(value, 10) })
              }
              placeholder={t('Enter port (1-65535)')}
              isRequired
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('The network port that this listener will bind to (1-65535).')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label={t('Hostname')} fieldId="listener-hostname">
            <TextInput
              type="text"
              id="listener-hostname"
              value={currentListener.hostname}
              onChange={(_event, value) =>
                setCurrentListener({ ...currentListener, hostname: value })
              }
              placeholder={t('Enter hostname (optional)')}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('Optional hostname to match requests. Leave empty to match all hostnames.')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      ),
    },
    {
      name: t('Protocol'),
      nextButtonText: t('Next'),
      form: (
        <Form>
          <FormGroup label={t('Protocol')} isRequired fieldId="listener-protocol">
            <FormSelect
              value={currentListener.protocol}
              onChange={(_event, value) =>
                setCurrentListener({ ...currentListener, protocol: value })
              }
              aria-label={t('Select Protocol')}
            >
              <FormSelectOption value="HTTP" label="HTTP" />
              <FormSelectOption value="HTTPS" label="HTTPS" />
              <FormSelectOption value="TLS" label="TLS" />
              <FormSelectOption value="TCP" label="TCP" />
              <FormSelectOption value="UDP" label="UDP" />
            </FormSelect>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{t('The protocol that this listener will accept.')}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {(currentListener.protocol === 'HTTPS' || currentListener.protocol === 'TLS') && (
            <FormGroup
              label={t('TLS Mode')}
              isRequired
              fieldId="listener-tls-mode"
              style={{ marginLeft: '20px' }}
            >
              <FormSelect
                value={currentListener.tlsMode}
                onChange={(_event, value) =>
                  setCurrentListener({ ...currentListener, tlsMode: value })
                }
                aria-label={t('Select TLS Mode')}
              >
                <FormSelectOption value="Terminate" label="Terminate" />
                <FormSelectOption value="Passthrough" label="Passthrough" />
              </FormSelect>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t(
                      'TLS termination mode. Terminate decrypts TLS at the gateway, Passthrough forwards encrypted traffic.',
                    )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )}

          {(currentListener.protocol === 'HTTPS' || currentListener.protocol === 'TLS') &&
            currentListener.tlsMode === 'Terminate' && (
              <FormGroup
                label={t('Certificate References')}
                fieldId="listener-certificate-refs"
                style={{ marginLeft: '40px' }}
                isRequired
              >
                {currentListener.certificateRefs.map((certRef, index) => (
                  <div
                    key={certRef.id}
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      border: '1px solid #d2d2d2',
                      borderRadius: '4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <strong>
                        {t('Certificate Reference')} {index + 1}
                      </strong>
                      <Button
                        variant="link"
                        isDanger
                        onClick={() => handleRemoveCertificateRef(certRef.id)}
                        isDisabled={currentListener.certificateRefs.length === 1}
                      >
                        {t('Remove')}
                      </Button>
                    </div>

                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}
                    >
                      <FormGroup label={t('Name')} isRequired fieldId={`cert-name-${certRef.id}`}>
                        <TextInput
                          type="text"
                          id={`cert-name-${certRef.id}`}
                          value={certRef.name}
                          onChange={(_event, value) =>
                            handleCertificateRefChange(certRef.id, 'name', value)
                          }
                          placeholder={t('Certificate name')}
                          isRequired
                        />
                      </FormGroup>

                      <FormGroup label={t('Namespace')} fieldId={`cert-namespace-${certRef.id}`}>
                        <TextInput
                          type="text"
                          id={`cert-namespace-${certRef.id}`}
                          value={certRef.namespace}
                          onChange={(_event, value) =>
                            handleCertificateRefChange(certRef.id, 'namespace', value)
                          }
                          placeholder={t('Certificate namespace')}
                        />
                      </FormGroup>

                      <FormGroup label={t('Kind')} isRequired fieldId={`cert-kind-${certRef.id}`}>
                        <FormSelect
                          value={certRef.kind}
                          onChange={(_event, value) =>
                            handleCertificateRefChange(certRef.id, 'kind', value)
                          }
                          aria-label={t('Select Certificate Kind')}
                        >
                          <FormSelectOption value="Secret" label="Secret" />
                          <FormSelectOption value="ConfigMap" label="ConfigMap" />
                        </FormSelect>
                      </FormGroup>
                    </div>
                  </div>
                ))}

                <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddCertificateRef}>
                  {t('Add certificate reference')}
                </Button>

                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t(
                        'Certificate references for TLS termination. Specify the name, namespace, and kind of the certificate resource.',
                      )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            )}

          {(currentListener.protocol === 'HTTPS' || currentListener.protocol === 'TLS') &&
            currentListener.tlsMode === 'Terminate' && (
              <FormGroup
                label={t('TLS Options')}
                fieldId="tls-options"
                style={{ marginLeft: '20px' }}
              >
                {currentListener.tlsOptions.map((option, index) => (
                  <div
                    key={option.id}
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      border: '1px solid #d2d2d2',
                      borderRadius: '4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <strong>
                        {t('TLS Option')} {index + 1}
                      </strong>
                      <Button
                        variant="link"
                        isDanger
                        onClick={() => handleRemoveTlsOption(option.id)}
                      >
                        {t('Remove')}
                      </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <FormGroup label={t('Key')} isRequired fieldId={`tls-key-${option.id}`}>
                        <TextInput
                          type="text"
                          id={`tls-key-${option.id}`}
                          value={option.key}
                          onChange={(_event, value) =>
                            handleTlsOptionChange(option.id, 'key', value)
                          }
                          placeholder={t('e.g., minVersion, cipherSuites')}
                          isRequired
                        />
                      </FormGroup>

                      <FormGroup label={t('Value')} isRequired fieldId={`tls-value-${option.id}`}>
                        <TextInput
                          type="text"
                          id={`tls-value-${option.id}`}
                          value={option.value}
                          onChange={(_event, value) =>
                            handleTlsOptionChange(option.id, 'value', value)
                          }
                          placeholder={t('e.g., TLSv1.2, ECDHE-RSA-AES256-GCM-SHA384')}
                          isRequired
                        />
                      </FormGroup>
                    </div>
                  </div>
                ))}

                <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddTlsOption}>
                  {t('Add TLS option')}
                </Button>

                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t(
                        'A map of key/value pairs to enable implementation-specific TLS options, such as minimum TLS version or cipher suites.',
                      )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            )}
        </Form>
      ),
    },
    {
      name: t('Allowed Routes'),
      nextButtonText: t('Next'),
      form: (
        <Form>
          <FormGroup label={t('Allowed Namespaces')} fieldId="allowed-namespaces">
            <FormSelect
              value={currentListener.allowedRoutes.namespaces.from}
              onChange={(_event, value) =>
                setCurrentListener({
                  ...currentListener,
                  allowedRoutes: {
                    ...currentListener.allowedRoutes,
                    namespaces: {
                      ...currentListener.allowedRoutes.namespaces,
                      from: value,
                    },
                  },
                })
              }
              aria-label={t('Select Allowed Namespaces')}
            >
              <FormSelectOption value="All" label={t('All')} />
              <FormSelectOption value="Same" label={t('Same')} />
              <FormSelectOption value="Selector" label={t('Selector')} />
            </FormSelect>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {currentListener.allowedRoutes.namespaces.from === 'All' &&
                    t('Allow from all namespaces.')}
                  {currentListener.allowedRoutes.namespaces.from === 'Same' &&
                    t("Allow only from the Gateway's namespace.")}
                  {currentListener.allowedRoutes.namespaces.from === 'Selector' &&
                    t('Allow from namespaces matching a specific label.')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label={t('Allowed Route Kinds')} fieldId="allowed-route-kinds">
            {currentListener.allowedRoutes.kinds.map((routeKind, index) => (
              <div
                key={routeKind.id}
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  border: '1px solid #d2d2d2',
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <strong>
                    {t('Route Kind')} {index + 1}
                  </strong>
                  <Button
                    variant="link"
                    isDanger
                    onClick={() => handleRemoveRouteKind(routeKind.id)}
                  >
                    {t('Remove')}
                  </Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormGroup label={t('Kind')} isRequired fieldId={`route-kind-${routeKind.id}`}>
                    <FormSelect
                      value={routeKind.kind}
                      onChange={(_event, value) =>
                        handleRouteKindChange(routeKind.id, 'kind', value)
                      }
                      aria-label={t('Select Route Kind')}
                    >
                      <FormSelectOption value="HTTPRoute" label="HTTPRoute" />
                      <FormSelectOption value="GRPCRoute" label="GRPCRoute" />
                      <FormSelectOption value="TCPRoute" label="TCPRoute" />
                      <FormSelectOption value="UDPRoute" label="UDPRoute" />
                      <FormSelectOption value="TLSRoute" label="TLSRoute" />
                    </FormSelect>
                  </FormGroup>

                  <FormGroup label={t('Group')} isRequired fieldId={`route-group-${routeKind.id}`}>
                    <TextInput
                      type="text"
                      id={`route-group-${routeKind.id}`}
                      value={routeKind.group}
                      onChange={(_event, value) =>
                        handleRouteKindChange(routeKind.id, 'group', value)
                      }
                      placeholder={t('e.g., gateway.networking.k8s.io')}
                      isRequired
                    />
                  </FormGroup>
                </div>
              </div>
            ))}

            <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddRouteKind}>
              {t('Add route kind')}
            </Button>

            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t(
                    'Restricts the types of Route resources that can attach to this listener (e.g., only HTTPRoute).',
                  )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      ),
    },
    {
      name: t('Review & Create'),
      nextButtonText: t('Create'),
      form: (
        <div>
          <h1>{t('Listener Summary')}</h1>
          <div style={{ marginTop: '20px' }}>
            <div>
              <strong>{t('Name')}:</strong> {currentListener.name || t('Not specified')}
            </div>
            <div>
              <strong>{t('Protocol')}:</strong> {currentListener.protocol}
            </div>
            <div>
              <strong>{t('Port')}:</strong> {currentListener.port}
            </div>
            <div>
              <strong>{t('Hostname')}:</strong> {currentListener.hostname || t('All hostnames')}
            </div>

            {(currentListener.protocol === 'HTTPS' || currentListener.protocol === 'TLS') && (
              <>
                <div>
                  <strong>{t('TLS Mode')}:</strong> {currentListener.tlsMode}
                </div>
                <div>
                  <strong>{t('Certificate References')}:</strong>{' '}
                  {currentListener.certificateRefs.length > 0
                    ? currentListener.certificateRefs.length
                    : t('None')}
                </div>
                <div>
                  <strong>{t('TLS Options')}:</strong>{' '}
                  {currentListener.tlsOptions.length > 0
                    ? currentListener.tlsOptions.length
                    : t('None')}
                </div>
              </>
            )}

            <div>
              <strong>{t('Allowed Namespaces')}:</strong>{' '}
              {currentListener.allowedRoutes.namespaces.from}
            </div>
            <div>
              <strong>{t('Allowed Route Kinds')}:</strong>{' '}
              {currentListener.allowedRoutes.kinds.length > 0
                ? currentListener.allowedRoutes.kinds.length
                : t('All route kinds')}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">
          {create ? t('Create Gateway') : t('Edit Gateway')}
        </title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <div className="co-m-nav-title">
          <Title headingLevel="h1">{create ? t('Create Gateway') : t('Edit Gateway')}</Title>
          <p className="help-block co-m-pane__heading-help-text">
            <div>
              {t(
                'A Gateway represents an instance of a service-traffic handling infrastructure by binding Listeners to a set of IP addresses.',
              )}
            </div>
          </p>
        </div>
        <div className="gateway-editor-toggle">
          <span>Create via:</span>
          <Radio
            name="create-type-radio"
            label="Form"
            id="create-type-radio-form"
            isChecked={createView === 'form'}
            onChange={() => setCreateView('form')}
          />
          <Radio
            name="create-type-radio"
            label="YAML"
            id="create-type-radio-yaml"
            isChecked={createView === 'yaml'}
            onChange={() => setCreateView('yaml')}
          />
        </div>
      </PageSection>

      {/* Loading state */}
      {isLoading ? (
        <PageSection hasBodyWrapper={false}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
            }}
          >
            <Spinner size="lg" />
            <span style={{ marginLeft: '16px' }}>{t('Loading gateway...')}</span>
          </div>
        </PageSection>
      ) : (
        <>
          {/* Conditional rendering based on current view */}
          {createView === 'form' ? (
            <PageSection hasBodyWrapper={false}>
              <Form className="co-m-pane__form">
                <FormGroup label={t('Gateway name')} isRequired fieldId="gateway-name">
                  <TextInput
                    type="text"
                    id="gateway-name"
                    name="gateway-name"
                    value={gatewayName}
                    onChange={(_event, value) => setGatewayName(value)}
                    isRequired
                    isDisabled={!create} // Disable during edit as names are immutable
                    placeholder={t('Enter gateway name')}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        {!create
                          ? t('Gateway names cannot be changed after creation.')
                          : t('A unique name for the gateway within the namespace.')}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>

                <FormGroup label={t('Gateway Class Name')} isRequired fieldId="gateway-class-name">
                  <FormSelect
                    value={gatewayClassName}
                    onChange={handleGatewayClassChange}
                    aria-label={t('Select Gateway Class')}
                    isDisabled={!create} // Disable during edit as gateway class shouldn't be changed
                  >
                    <FormSelectOption value="istio" label={t('Istio')} />
                    <FormSelectOption value="envoy-gateway" label={t('Envoy Gateway')} />
                  </FormSelect>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        {!create
                          ? t('Gateway class cannot be changed after creation.')
                          : t(
                              'The gateway class name must be unique within the namespace and conform to DNS-1123 label standards (lowercase alphanumeric characters or "-").',
                            )}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>

                <FormGroup
                  label={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>{t('Listeners')}</div>
                        <Popover
                          bodyContent={t(
                            'Listeners define how the Gateway accepts traffic. Each listener specifies a protocol, port, and hostname to match incoming requests.',
                          )}
                          aria-label={t('Listeners help')}
                        >
                          <Button variant="plain" aria-label={t('Listeners help')}>
                            <HelpIcon />
                          </Button>
                        </Popover>
                      </div>
                      <Button
                        variant="secondary"
                        icon={<PlusCircleIcon />}
                        onClick={handleAddListener}
                      >
                        {t('Add listener')}
                      </Button>
                    </div>
                  }
                  fieldId="listeners"
                >
                  {listeners.length === 0 && (
                    <Alert
                      variant="warning"
                      title={t('At least one listener is required to create a Gateway.')}
                    />
                  )}
                  {listeners.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <Table aria-label={t('Listeners table')} variant="compact">
                        <Thead>
                          <Tr>
                            <Th>{t('Name')}</Th>
                            <Th>{t('Protocol')}</Th>
                            <Th>{t('Port')}</Th>
                            <Th>{t('Hostname')}</Th>
                            <Th>{t('TLS Mode')}</Th>
                            <Th>{t('Actions')}</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {listeners.map((listener, index) => (
                            <Tr key={index}>
                              <Td dataLabel={t('Name')}>{listener.name || t('Unnamed')}</Td>
                              <Td dataLabel={t('Protocol')}>{listener.protocol}</Td>
                              <Td dataLabel={t('Port')}>{listener.port}</Td>
                              <Td dataLabel={t('Hostname')}>
                                {listener.hostname || t('All hostnames')}
                              </Td>
                              <Td dataLabel={t('TLS Mode')}>
                                {listener.protocol === 'HTTPS' || listener.protocol === 'TLS'
                                  ? listener.tlsMode
                                  : t('N/A')}
                              </Td>
                              <Td dataLabel={t('Actions')}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <Button
                                    variant="plain"
                                    aria-label={t('Edit listener')}
                                    onClick={() => handleEditListener(index)}
                                  >
                                    <EditIcon />
                                  </Button>
                                  <Button
                                    variant="plain"
                                    aria-label={t('Remove listener')}
                                    onClick={() => handleRemoveListener(index)}
                                    isDanger
                                  >
                                    <TrashIcon />
                                  </Button>
                                </div>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </div>
                  )}
                </FormGroup>

                <FormGroup
                  label={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button
                        variant="plain"
                        onClick={() => setIsAddressesExpanded(!isAddressesExpanded)}
                        style={{
                          padding: 0,
                          fontSize: 'inherit',
                          fontWeight: 'inherit',
                          color: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {isAddressesExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                        <span>{t('Addresses (Optional)')}</span>
                      </Button>
                      <Popover
                        bodyContent={t(
                          'Request a specific static IP address or hostname for the Gateway. This is optional and used to specify where the Gateway should be accessible.',
                        )}
                        aria-label={t('Addresses help')}
                      >
                        <Button variant="plain" aria-label={t('Addresses help')}>
                          <HelpIcon />
                        </Button>
                      </Popover>
                    </div>
                  }
                  fieldId="addresses"
                >
                  {isAddressesExpanded && (
                    <div>
                      {addresses.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <Table aria-label={t('Addresses table')} variant="compact">
                            <Thead>
                              <Tr>
                                <Th>{t('Type')}</Th>
                                <Th>{t('Value')}</Th>
                                <Th>{t('Actions')}</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {addresses.map((address) => (
                                <Tr key={address.id}>
                                  <Td dataLabel={t('Type')}>
                                    <FormSelect
                                      value={address.type}
                                      onChange={(_event, value) =>
                                        handleAddressChange(address.id, 'type', value)
                                      }
                                      aria-label={t('Select Address Type')}
                                    >
                                      <FormSelectOption value="IPAddress" label="IPAddress" />
                                      <FormSelectOption value="Hostname" label="Hostname" />
                                    </FormSelect>
                                  </Td>
                                  <Td dataLabel={t('Value')}>
                                    <TextInput
                                      type="text"
                                      value={address.value}
                                      onChange={(_event, value) =>
                                        handleAddressChange(address.id, 'value', value)
                                      }
                                      placeholder={
                                        address.type === 'IPAddress'
                                          ? t('e.g., 192.168.1.100')
                                          : t('e.g., gateway.example.com')
                                      }
                                      isRequired
                                    />
                                  </Td>
                                  <Td dataLabel={t('Actions')}>
                                    <Button
                                      variant="plain"
                                      aria-label={t('Remove address')}
                                      onClick={() => handleRemoveAddress(address.id)}
                                      isDanger
                                    >
                                      <TrashIcon />
                                    </Button>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        icon={<PlusCircleIcon />}
                        onClick={handleAddAddress}
                      >
                        {t('Add address')}
                      </Button>
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            {t(
                              'Specify static IP addresses or hostnames where the Gateway should be accessible. This is optional and depends on your infrastructure setup.',
                            )}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    </div>
                  )}
                </FormGroup>
              </Form>
            </PageSection>
          ) : (
            <>
              {yamlError && (
                <PageSection>
                  <Alert variant="warning" title={t('Error: YAML Validation')} isInline>
                    {yamlError}
                  </Alert>
                </PageSection>
              )}
              <React.Suspense fallback={<div>{t('Loading YAML editor...')}</div>}>
                <ResourceYAMLEditor
                  initialResource={yamlContent}
                  onChange={handleYamlChange}
                  create={create}
                />
              </React.Suspense>
            </>
          )}
          {!isLoading && createView === 'form' && (
            <GatewayApiCreateUpdate
              view={createView}
              formValidation={formValidation()}
              model={gatewayModel}
              resource={gatewayObject}
              ns={selectedNamespace}
              resourceKind="Gateway"
            />
          )}
        </>
      )}

      <Modal
        variant="large"
        title={editingListenerIndex !== null ? t('Edit listener') : t('Add listener')}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      >
        <Wizard onClose={handleModalClose} onSave={handleListenerSave} height="400px">
          {wizardSteps.map((step, index) => (
            <WizardStep
              key={index}
              name={step.name}
              id={`step-${index}`}
              footer={{
                nextButtonText:
                  index === wizardSteps.length - 1
                    ? editingListenerIndex !== null
                      ? t('Update')
                      : t('Add')
                    : step.nextButtonText,
              }}
            >
              {step.form}
            </WizardStep>
          ))}
        </Wizard>
      </Modal>
    </>
  );
};

export default GatewayCreatePage;
