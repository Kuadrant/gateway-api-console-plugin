import * as React from 'react';
import Helmet from 'react-helmet';
import {
  PageSection,
  Title,
  TextInput,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Form,
  Radio,
  Button,
  ButtonVariant,
  Alert,
  Modal,
  AlertVariant,
  Popover,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon, HelpIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import {
  ResourceYAMLEditor,
  getGroupVersionKindForResource,
  useK8sModel,
  useK8sWatchResource,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';
import { useLocation } from 'react-router-dom';
import yaml from 'js-yaml';
import GatewayApiCreateUpdate from './GatewayApiCreateUpdate';
import ParentReferencesSelect from '../utils/ParentReferencesSelect';
import {
  ActionsColumn,
  IAction,
  Table,
  TableText,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { HTTPRouteResource, HTTPRouteMatch } from './httproute/HTTPRouteModel';
import HTTPRouteRuleWizard from './httproute/HTTPRouteRuleWizard';
import './css/gateway-api-plugin.css';
const generateMatchesForYAML = (matches: HTTPRouteMatch[]) => {
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

const parseMatchesFromYAML = (yamlMatches: any[]): HTTPRouteMatch[] => {
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

const validateMatchesInRule = (matches: HTTPRouteMatch[]): boolean => {
  return (
    matches.length === 0 ||
    matches.every((match) => match.pathType && match.pathValue && match.method)
  );
};

const formatMatchesForDisplay = (matches: any[], t: any) => {
  if (!matches || matches.length === 0) {
    return <span style={{ color: '#666' }}>—</span>;
  }

  return (
    <TableText>
      <div>
        {matches.slice(0, 3).map((match, idx) => (
          <div key={idx} style={{ marginBottom: '4px' }}>
            {match.pathType || 'PathPrefix'} {match.pathValue || '/'} | {match.method || 'GET'}
          </div>
        ))}
        {matches.length > 3 && (
          <Popover
            headerContent={t('All matches')}
            bodyContent={
              <div>
                {matches.slice(3).map((match, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: idx < matches.slice(3).length - 1 ? '4px' : '0',
                    }}
                  >
                    {match.pathType || 'PathPrefix'} {match.pathValue || '/'} |{' '}
                    {match.method || 'GET'}
                  </div>
                ))}
              </div>
            }
          >
            <Button variant="link" isInline style={{ padding: 0, fontSize: '14px' }}>
              +{matches.length - 3} {t('more')}
            </Button>
          </Popover>
        )}
      </div>
    </TableText>
  );
};

const formatFiltersForDisplay = (filters: any[], t: any) => {
  if (!filters || filters.length === 0) {
    return <span style={{ color: '#666' }}>—</span>;
  }

  return (
    <TableText>
      <div>
        {filters.slice(0, 3).map((filter, idx) => (
          <div key={idx} style={{ marginBottom: '4px' }}>
            {filter.type || 'Unknown Filter'}
          </div>
        ))}
        {filters.length > 3 && (
          <Popover
            headerContent={t('All filters')}
            bodyContent={
              <div>
                {filters.slice(3).map((filter, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: idx < filters.slice(3).length - 1 ? '4px' : '0',
                    }}
                  >
                    {filter.type || 'Unknown Filter'}
                  </div>
                ))}
              </div>
            }
          >
            <Button variant="link" isInline style={{ padding: 0, fontSize: '14px' }}>
              +{filters.length - 3} {t('more')}
            </Button>
          </Popover>
        )}
      </div>
    </TableText>
  );
};

const formatBackendsForDisplay = (rule: any, t: any) => {
  if (rule.serviceName && rule.servicePort) {
    return (
      <TableText>
        <div>
          <strong>{rule.serviceName}:</strong> {rule.servicePort}
        </div>
      </TableText>
    );
  }

  if (!rule.backendRefs || rule.backendRefs.length === 0) {
    return <span style={{ color: '#666' }}>—</span>;
  }

  return (
    <TableText>
      <div>
        {rule.backendRefs.slice(0, 3).map((ref: any, idx: number) => (
          <div key={idx} style={{ marginBottom: '4px' }}>
            <strong>{ref.serviceName}:</strong> {ref.port}
            {ref.weight !== 1 && ` (weight: ${ref.weight})`}
          </div>
        ))}
        {rule.backendRefs.length > 3 && (
          <Popover
            headerContent={t('All backend references')}
            bodyContent={
              <div>
                {rule.backendRefs.slice(3).map((ref: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: idx < rule.backendRefs.slice(3).length - 1 ? '4px' : '0',
                    }}
                  >
                    <strong>{ref.serviceName}:</strong> {ref.port}
                    {ref.weight !== 1 && ` (weight: ${ref.weight})`}
                  </div>
                ))}
              </div>
            }
          >
            <Button variant="link" isInline style={{ padding: 0, fontSize: '14px' }}>
              +{rule.backendRefs.length - 3} {t('more')}
            </Button>
          </Popover>
        )}
      </div>
    </TableText>
  );
};

interface ParentReference {
  id: string;
  gatewayName: string;
  gatewayNamespace: string;
  sectionName: string;
  port: number;
  isExpanded?: boolean;
}

const HTTPRouteCreatePage: React.FC = () => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [createView, setCreateView] = React.useState<'form' | 'yaml'>('form');
  const [routeName, setRouteName] = React.useState('');
  const [hostnames, setHostnames] = React.useState<string[]>([]);
  const [selectedNamespaceRaw] = useActiveNamespace();

  // YAML editor state
  const [yamlContent, setYamlContent] = React.useState<any>(null);
  const [yamlError, setYamlError] = React.useState<string | null>(null);
  const [parentRefs, setParentRefs] = React.useState<ParentReference[]>([]);

  // Metadata for determining edit/create mode
  const [originalMetadata, setOriginalMetadata] = React.useState<any>(null);

  //   Determine mode by checking originalMetadata
  const isEdit = !!originalMetadata;
  const [rules, setRules] = React.useState<any[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = React.useState(false);

  const [currentRule, setCurrentRule] = React.useState({
    id: `rule-${Date.now().toString(7)}`,
    matches: [], // Array of match objects
    filters: [], // Filters array
    serviceName: '', // Backend service name
    servicePort: 80, // Backend service port
  });

  const [editingRuleIndex, setEditingRuleIndex] = React.useState<number | null>(null);

  const location = useLocation();
  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[5];
  const namespaceEdit = pathSplit[3];
  const [formDisabled, setFormDisabled] = React.useState(false);
  const selectedNamespace =
    !selectedNamespaceRaw || selectedNamespaceRaw === '#ALL_NS#' ? 'default' : selectedNamespaceRaw;
  // Function to add a new hostname field
  const addHostnameField = () => {
    setHostnames([...hostnames, '']);
  };

  //Function to remove a hostname field
  const removeHostnameField = (index: number) => {
    const newHostnames = hostnames.filter((_, i) => i !== index);
    setHostnames(newHostnames);
  };

  // Function to update a hostname value
  const updateHostname = (value: string, index: number) => {
    const newHostnames = [...hostnames];
    newHostnames[index] = value;
    setHostnames(newHostnames);
  };

  // When form completed, build HTTPRoute resource object from form data (following Gateway pattern)
  const httpRouteObject = React.useMemo(() => {
    // Filter out empty hostnames
    const validHostnames = hostnames.filter((h) => h.trim().length > 0);
    const validParentRefs = parentRefs.filter((ref) => ref.gatewayName && ref.sectionName);

    const httpRoute = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: originalMetadata
        ? {
            ...originalMetadata,
          }
        : {
            name: routeName,
            namespace: selectedNamespace,
          },
      spec: {
        parentRefs: validParentRefs.map((ref) => ({
          name: ref.gatewayName,
          ...(ref.gatewayNamespace !== selectedNamespace
            ? { namespace: ref.gatewayNamespace }
            : {}),
          ...(ref.sectionName ? { sectionName: ref.sectionName } : {}),
          ...(ref.port ? { port: ref.port } : {}),
        })),
        ...(validHostnames.length > 0 ? { hostnames: validHostnames } : {}),
        rules: rules.map((rule) => ({
          ...(rule.matches.length > 0 ? { matches: generateMatchesForYAML(rule.matches) } : {}),
          ...(rule.filters && rule.filters.length > 0 ? { filters: rule.filters } : {}),
          backendRefs: [
            {
              name: rule.serviceName,
              port: rule.servicePort,
            },
          ],
        })),
      },
    };

    return httpRoute;
  }, [routeName, hostnames, parentRefs, rules, selectedNamespace, originalMetadata]);

  const populateFormFromHTTPRoute = (httpRoute: any, isEditMode = false) => {
    try {
      if (httpRoute.metadata?.name) {
        setRouteName(httpRoute.metadata.name);
      }

      if (httpRoute.spec?.hostnames) {
        setHostnames(httpRoute.spec.hostnames);
      }

      if (httpRoute.spec?.parentRefs && httpRoute.spec.parentRefs.length > 0) {
        const formattedParentRefs = httpRoute.spec.parentRefs.map((ref: any, index: number) => ({
          id: `parent-${Date.now()}-${index}`,
          gatewayName: ref.name || '',
          gatewayNamespace: ref.namespace || selectedNamespace,
          sectionName: ref.sectionName || '',
          port: ref.port || '',
        }));
        setParentRefs(formattedParentRefs);
      }

      if (httpRoute.spec?.rules && httpRoute.spec.rules.length > 0) {
        const formattedRules = httpRoute.spec.rules.map((rule: any, index: number) => ({
          id: `rule-${Date.now()}-${index}`,
          matches: parseMatchesFromYAML(rule.matches),
          filters: rule.filters || [],
          serviceName: rule.backendRefs?.[0]?.name || '',
          servicePort: rule.backendRefs?.[0]?.port || 80,
        }));
        setRules(formattedRules);
      }

      // Only disable form when actually in edit mode (loading existing HTTPRoute)
      if (isEditMode) {
        setFormDisabled(true);
      }
    } catch (error) {
      console.error('Error populating form from HTTPRoute:', error);
    }
  };

  const httpRouteGVK = getGroupVersionKindForResource({
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'HTTPRoute',
  });

  const [httpRouteModel] = useK8sModel({
    group: httpRouteGVK.group,
    version: httpRouteGVK.version,
    kind: httpRouteGVK.kind,
  });

  // Check if there is an HTTPRoute for editing
  let httpRouteResource = null;
  if (nameEdit && nameEdit !== '~new') {
    httpRouteResource = {
      groupVersionKind: httpRouteGVK,
      isList: false,
      name: nameEdit,
      namespace: namespaceEdit,
    };
  }

  const [httpRouteData, httpRouteLoaded, httpRouteError] = httpRouteResource
    ? useK8sWatchResource(httpRouteResource)
    : [null, true, null]; // If no resource to load, consider it loaded

  React.useEffect(() => {
    if (httpRouteResource && httpRouteLoaded && !httpRouteError) {
      if (!Array.isArray(httpRouteData)) {
        const httpRouteUpdate = httpRouteData as HTTPRouteResource;
        console.log('httpRouteUpdate', httpRouteUpdate);
        setOriginalMetadata(httpRouteUpdate.metadata);
        populateFormFromHTTPRoute(httpRouteUpdate, true); // Edit mode
        setYamlContent(httpRouteUpdate);
      }
    } else if (httpRouteError) {
      console.error('Failed to fetch the HTTPRoute resource:', httpRouteError);
    }
  }, [httpRouteData, httpRouteLoaded, httpRouteError, httpRouteResource]);

  React.useEffect(() => {
    try {
      setYamlContent(httpRouteObject);
    } catch (error) {
      console.error('Error converting form data to YAML:', error);
    }
  }, [httpRouteObject]);

  // Handle YAML changes and sync to form (following Gateway pattern)
  const handleYAMLChange = (yamlInput: string) => {
    setYamlContent(yamlInput);
    setYamlError(null);
    try {
      const parsedHTTPRoute = yaml.load(yamlInput);
      if (parsedHTTPRoute && typeof parsedHTTPRoute === 'object') {
        populateFormFromHTTPRoute(parsedHTTPRoute);
      }
    } catch (error: any) {
      const errorMessage =
        error.message ||
        'Invalid YAML syntax. Please review the HTTPRoute Resource YAML and try again.';
      setYamlError(errorMessage);
      console.warn('Invalid YAML syntax, not updating form:', error);
    }
  };

  const handleRouteNameChange = (_event: any, name: string) => {
    setRouteName(name);
  };

  const formValidation = () => {
    const hasValidParentRef = parentRefs.some((ref) => ref.gatewayName && ref.sectionName);

    const hasValidRules =
      rules.length > 0 &&
      rules.every((rule) => {
        const basicFieldsValid = rule.id && rule.serviceName && rule.servicePort > 0;

        const matchesValid = validateMatchesInRule(rule.matches);

        return basicFieldsValid && matchesValid;
      });

    return !!(routeName && hasValidParentRef && hasValidRules);
  };

  const handleAddRule = () => {
    setEditingRuleIndex(null);
    setCurrentRule({
      id: `rule-${Date.now().toString(36)}`,
      matches: [],
      filters: [],
      serviceName: '',
      servicePort: 80,
    });
    setIsRuleModalOpen(true);
  };

  const handleRuleModalClose = () => {
    setIsRuleModalOpen(false);
  };

  const handleRuleSave = () => {
    let newRules: any[];
    if (editingRuleIndex !== null) {
      // EDIT mode - replace existing rule
      newRules = [...rules];
      newRules[editingRuleIndex] = { ...currentRule };
    } else {
      // CREATE mode - add new rule
      newRules = [...rules, { ...currentRule }];
    }
    setRules(newRules);
    setIsRuleModalOpen(false);
    console.log('Rule saved:', currentRule);
  };

  const handleEditRule = (index: number) => {
    setEditingRuleIndex(index); // Edit mode
    setCurrentRule({ ...rules[index] }); // Load data into form
    setIsRuleModalOpen(true); // Open modal
  };

  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
  };

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">{t('Edit Gateway')}</title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <div className="co-m-nav-title">
          <Title headingLevel="h1">{t('Create HTTPRoute')}</Title>
          <p className="help-block co-m-pane__heading-help-text">
            <div>
              {t('Create an HTTPRoute to route traffic from the Gateway to backend services.')}
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

      {createView === 'form' ? (
        <PageSection hasBodyWrapper={false}>
          <Form className="co-m-pane__form">
            <FormGroup label={t('HTTPRoute Name')} isRequired fieldId="route-name">
              <TextInput
                isRequired
                type="text"
                id="route-name"
                name="route-name"
                value={routeName}
                onChange={handleRouteNameChange}
                isDisabled={formDisabled}
                placeholder={t('HTTPRoute name')}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t(
                      "The HTTPRoute name must be unique within the namespace and conform to DNS-1123 label standards (lowercase alphanumeric characters or '-').",
                    )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup
              label={
                <span>
                  {t('Hostnames')}{' '}
                  <Popover
                    headerContent={t('Hostname')}
                    bodyContent={
                      <div>
                        <p>{t('Matches traffic for these hostnames.')}</p>
                        <ul>
                          <li>{t('Supports wildcards (e.g., *.example.com).')}</li>
                          <li>{t('Inherits from parent listener if empty.')}</li>
                        </ul>
                      </div>
                    }
                    aria-label={t('Hostnames help')}
                  >
                    <Button variant="plain" aria-label={t('Hostnames help')}>
                      <HelpIcon />
                    </Button>
                  </Popover>
                </span>
              }
              fieldId="hostnames"
            >
              {hostnames.map((hostname, index) => (
                <div
                  key={index}
                  className="pf-v5-c-form__group-control"
                  style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                >
                  <TextInput
                    type="text"
                    id={`hostname-${index}`}
                    value={hostname}
                    onChange={(_, value) => updateHostname(value, index)}
                    placeholder={t('example.com')}
                    isDisabled={formDisabled}
                  />
                  {hostnames.length > 0 && !formDisabled && (
                    <Button
                      variant={ButtonVariant.plain}
                      onClick={() => removeHostnameField(index)}
                      aria-label="Remove hostname"
                    >
                      <MinusCircleIcon />
                    </Button>
                  )}
                </div>
              ))}
              {!formDisabled && (
                <Button
                  variant={ButtonVariant.link}
                  icon={<PlusCircleIcon />}
                  onClick={addHostnameField}
                  isInline
                >
                  {t('Add hostname')}
                </Button>
              )}
            </FormGroup>

            <ParentReferencesSelect
              parentRefs={parentRefs}
              onChange={setParentRefs}
              isDisabled={formDisabled}
            />
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
                  <div>
                    {t('Rules')} <span style={{ color: 'red' }}>*</span>
                    <Popover
                      headerContent={t('Rules')}
                      bodyContent={
                        <div>
                          <p>{t('Rules are used for matching and processing requests. ')}</p>
                          <ul>
                            <li>{t('Requests are evaluated against rules in order.')}</li>
                            <li>{t('The first rule that matches is used.')}</li>
                          </ul>
                        </div>
                      }
                      aria-label={t('Rules help')}
                    >
                      <Button variant="plain" aria-label={t('Rules help')}>
                        <HelpIcon />
                      </Button>
                    </Popover>
                  </div>

                  <Button variant="secondary" icon={<PlusCircleIcon />} onClick={handleAddRule}>
                    {t('Add rule')}
                  </Button>
                </div>
              }
              fieldId="rules"
            >
              {rules.length === 0 && (
                <Alert
                  variant={AlertVariant.warning}
                  isInline
                  title={t('No rules defined. HTTPRoute will use default routing.')}
                />
              )}

              {rules.length > 0 && (
                <div className="rules-table-wrapper">
                  <Table aria-label={t('Rules table')} variant="compact" borders={true}>
                    <Thead>
                      <Tr>
                        <Th>{t('Rule ID')}</Th>
                        <Th>{t('Matches')}</Th>
                        <Th>{t('Filters')}</Th>
                        <Th>{t('Backend References')}</Th>
                        <Th screenReaderText="Actions" />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rules.map((rule, index) => {
                        // actions for each rule
                        const ruleActions: IAction[] = [
                          {
                            title: t('Edit'),
                            onClick: () => handleEditRule(index),
                          },
                          {
                            isSeparator: true,
                          },
                          {
                            title: t('Delete'),
                            onClick: () => handleRemoveRule(index),
                          },
                        ];

                        return (
                          <Tr key={index}>
                            <Td dataLabel={t('Rule ID')}>
                              <TableText>
                                <strong>{rule.id}</strong>
                              </TableText>
                            </Td>
                            <Td dataLabel={t('Matches')}>
                              {formatMatchesForDisplay(rule.matches, t)}
                            </Td>
                            <Td dataLabel={t('Filters')}>
                              {formatFiltersForDisplay(rule.filters, t)}
                            </Td>
                            <Td dataLabel={t('Backend References')}>
                              {formatBackendsForDisplay(rule, t)}
                            </Td>
                            <Td isActionCell>
                              <ActionsColumn items={ruleActions} />
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </div>
              )}
            </FormGroup>

            <GatewayApiCreateUpdate
              view={createView}
              formValidation={formValidation()}
              model={httpRouteModel}
              resource={httpRouteObject}
              ns={selectedNamespace}
              resourceKind="HTTPRoute"
            />
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
              onChange={handleYAMLChange}
              create={!isEdit}
            />
          </React.Suspense>
        </>
      )}
      <Modal
        variant="large"
        title={editingRuleIndex !== null ? t('Edit rule') : t('Add rule')}
        isOpen={isRuleModalOpen}
      >
        <HTTPRouteRuleWizard
          isOpen={isRuleModalOpen}
          onClose={handleRuleModalClose}
          onSave={handleRuleSave}
          currentRule={currentRule}
          setCurrentRule={setCurrentRule}
          editingRuleIndex={editingRuleIndex}
          t={t}
        />
      </Modal>
    </>
  );
};

export default HTTPRouteCreatePage;
