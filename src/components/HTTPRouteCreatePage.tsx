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
  ActionGroup,
  ButtonVariant,
  Alert,
  Modal,
  Wizard,
  WizardStep,
  AlertVariant,
  WizardHeader,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon, TrashIcon, EditIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import {
  ResourceYAMLEditor,
  getGroupVersionKindForResource,
  useK8sModel,
  useK8sWatchResource,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';
import { useHistory, useLocation } from 'react-router-dom';
// import GatewaySelect from '../utils/GatewaySelect';
import yaml from 'js-yaml';
import HTTPRouteCreateUpdate from './HTTPRouteCreateUpdate';
import ParentReferencesSelect from '../utils/ParentReferencesSelect';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { MatchesWizardStep, validateMatchesStep } from './matches/MatchesWizardStep';
import {
  formatMatchesForDisplay,
  generateMatchesForYAML,
  parseMatchesFromYAML,
  validateMatchesInRule,
} from './matches/MathcesUtils';
import {
  BackendReferencesWizardStep,
  validateBackendReferencesStep,
} from './backend-refs/BackendReferencesWizardStep';
import {
  generateBackendRefsForYAML,
  parseBackendRefsFromYAML,
  validateBackendRefsInRule,
} from './backend-refs/BackendReferencesUtils';

// interface Gateway {
//   name: string;
//   namespace: string;
// }

interface HTTPRouteEdit extends K8sResourceCommon {
  spec?: {
    parentRefs?: Array<{
      name?: string;
      namespace?: string;
    }>;
    hostnames?: string[];
    rules?: Array<{
      backendRefs?: Array<{
        name?: string;
        port?: number;
      }>;
    }>;
  };
}

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
  const [parentRefs, setParentRefs] = React.useState<ParentReference[]>([]);

  // Metadata for determining edit/create mode
  const [creationTimestamp, setCreationTimestamp] = React.useState('');
  const [resourceVersion, setResourceVersion] = React.useState('');

  //   Determine mode by checking resourceVersion
  const isEdit = !!resourceVersion;
  const [rules, setRules] = React.useState<any[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = React.useState(false);

  const [currentRule, setCurrentRule] = React.useState({
    id: `rule-${Date.now().toString(7)}`,
    matches: [],
    filters: [],
    backendRefs: [],
  });

  const [isMatchesValid, setIsMatchesValid] = React.useState(true);
  const [isBackendRefsValid, setIsBackendRefsValid] = React.useState(true);
  React.useEffect(() => {
    setIsMatchesValid(validateMatchesStep(currentRule));
  }, [currentRule.matches]);

  React.useEffect(() => {
    setIsBackendRefsValid(validateBackendReferencesStep(currentRule));
  }, [currentRule.backendRefs]);

  const [editingRuleIndex, setEditingRuleIndex] = React.useState<number | null>(null);

  const location = useLocation();
  const pathSplit = location.pathname.split('/');
  const nameEdit = pathSplit[6];
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

  const createHTTPRoute = () => {
    // Filter out empty hostnames
    const validHostnames = hostnames.filter((h) => h.trim().length > 0);
    const validParentRefs = parentRefs.filter((ref) => ref.gatewayName && ref.sectionName);

    return {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        name: routeName,
        namespace: selectedNamespace,
        // Add metadata only when editing
        ...(creationTimestamp ? { creationTimestamp } : {}),
        ...(resourceVersion ? { resourceVersion } : {}),
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
        rules:
          rules.length > 0
            ? rules.map((rule) => ({
                ...(rule.matches.length > 0
                  ? { matches: generateMatchesForYAML(rule.matches) }
                  : []),
                ...(rule.filters && rule.filters.length > 0 ? { filters: rule.filters } : {}),
                ...(rule.backendRefs && rule.backendRefs.length > 0
                  ? { backendRefs: generateBackendRefsForYAML(rule.backendRefs) }
                  : []),
              }))
            : [],
      },
    };
  };

  const httpRoute = createHTTPRoute();
  const httpRouteGVK = getGroupVersionKindForResource({
    apiVersion: 'gateway.networking.k8s.io/v1',
    kind: 'HTTPRoute',
  });

  const [httpRouteModel] = useK8sModel({
    group: httpRouteGVK.group,
    version: httpRouteGVK.version,
    kind: httpRouteGVK.kind,
  });

  const history = useHistory();

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
        const httpRouteUpdate = httpRouteData as HTTPRouteEdit;

        // Set metadata
        setCreationTimestamp(httpRouteUpdate.metadata?.creationTimestamp || '');
        setResourceVersion(httpRouteUpdate.metadata?.resourceVersion || '');
        setFormDisabled(true);
        setRouteName(httpRouteUpdate.metadata?.name || '');

        // Load parentRefs
        if (httpRouteUpdate.spec?.parentRefs) {
          const loadedParentRefs = httpRouteUpdate.spec.parentRefs.map((ref, index) => ({
            id: `parent-ref-${Date.now()}-${index}`,
            gatewayName: ref.name || '',
            gatewayNamespace: ref.namespace || httpRouteUpdate.metadata?.namespace || '',
            sectionName: (ref as any).sectionName || '',
            port: (ref as any).port || 80,
          }));
          setParentRefs(loadedParentRefs);
        }

        // Load hostnames
        const hostnameList = httpRouteUpdate.spec?.hostnames || [];
        setHostnames(Array.isArray(hostnameList) ? hostnameList.filter((h) => h.trim()) : []);

        console.log('Initializing HTTPRoute with existing data for update');
      }
    } else if (httpRouteError) {
      console.error('Failed to fetch the HTTPRoute resource:', httpRouteError);
    }
  }, [httpRouteData, httpRouteLoaded, httpRouteError, httpRouteResource]);

  const handleYAMLChange = (yamlInput: string) => {
    try {
      const parsedYaml = yaml.load(yamlInput) as any;

      // Update main fields
      setRouteName(parsedYaml.metadata?.name || '');

      // Update metadata
      setResourceVersion(parsedYaml.metadata?.resourceVersion || '');
      setCreationTimestamp(parsedYaml.metadata?.creationTimestamp || '');

      // Parse parentRefs
      if (parsedYaml.spec?.parentRefs) {
        const yamlParentRefs = parsedYaml.spec.parentRefs.map((ref: any, index: number) => ({
          id: `parent-ref-${Date.now()}-${index}`,
          gatewayName: ref.name || '',
          gatewayNamespace: ref.namespace || parsedYaml.metadata?.namespace || '',
          sectionName: ref.sectionName || '',
          port: ref.port || 80,
        }));
        setParentRefs(yamlParentRefs);
      }

      const yamlHostnames = parsedYaml.spec?.hostnames || [];
      setHostnames(Array.isArray(yamlHostnames) ? yamlHostnames.filter((h) => h.trim()) : []);

      if (parsedYaml.spec?.rules) {
        const yamlRules = parsedYaml.spec.rules.map((rule: any, index: number) => ({
          id: `rule-${Date.now()}-${index}`,
          matches: parseMatchesFromYAML(rule.matches),
          filters: rule.filters || [],
          backendRefs: parseBackendRefsFromYAML(rule.backendRefs || []),
        }));
        setRules(yamlRules);
      }
    } catch (e) {
      console.error(t('Error parsing YAML:'), e);
    }
  };

  const handleRouteNameChange = (_event: any, name: string) => {
    setRouteName(name);
  };

  const handleCancelResource = () => {
    history.push(`/k8s/ns/${selectedNamespace}/gateway.networking.k8s.io~v1~HTTPRoute`);
  };

  const formValidation = () => {
    const hasValidParentRef = parentRefs.some((ref) => ref.gatewayName && ref.sectionName);

    const hasValidRules =
      rules.length > 0 &&
      rules.every((rule) => {
        const basicFieldsValid = rule.id && rule.serviceName && rule.servicePort > 0;

        const matchesValid = validateMatchesInRule(rule.matches);
        const backendRefsValid = validateBackendRefsInRule(rule.backendRefs || []);
        return basicFieldsValid && matchesValid && backendRefsValid;
      });

    return !!(routeName && hasValidParentRef && hasValidRules);
  };

  const handleAddRule = () => {
    setEditingRuleIndex(null);
    setCurrentRule({
      id: `rule-${Date.now().toString(36)}`,
      matches: [],
      filters: [],
      backendRefs: [],
    });
    setIsRuleModalOpen(true);
  };

  const handleRuleModalClose = () => {
    setIsRuleModalOpen(false);
  };

  const handleRuleSave = () => {
    let newRules;
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
  const ruleWizardSteps = [
    {
      name: t('Matches'),
      nextButtonText: t('Next'),
      canJumpTo: validateMatchesStep(currentRule),
      enableNext: validateMatchesStep(currentRule),
      form: <MatchesWizardStep currentRule={currentRule} setCurrentRule={setCurrentRule} t={t} />,
    },
    {
      name: t('Backend Services'),
      nextButtonText: t('Create'),
      canJumpTo: validateBackendReferencesStep(currentRule),
      enableNext: validateBackendReferencesStep(currentRule),
      form: (
        <BackendReferencesWizardStep
          currentRule={currentRule}
          setCurrentRule={setCurrentRule}
          t={t}
        />
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">
          {isEdit ? t('Edit HTTPRoute') : t('Create HTTPRoute')}
        </title>
      </Helmet>
      <PageSection hasBodyWrapper={false} className="pf-m-no-padding">
        <div className="co-m-nav-title">
          <Title headingLevel="h1">{isEdit ? t('Edit HTTPRoute') : t('Create HTTPRoute')}</Title>
          <p className="help-block co-m-pane__heading-help-text">
            <div>{t('HTTPRoute provides a way to route HTTP requests to backends.')}</div>
          </p>
        </div>
        <FormGroup
          className="kuadrant-editor-toggle"
          role="radiogroup"
          isInline
          hasNoPaddingTop
          fieldId="create-type-radio-group"
          label={t('Create via:')}
        >
          <Radio
            name="create-type-radio"
            label={t('Form')}
            id="create-type-radio-form"
            isChecked={createView === 'form'}
            onChange={() => setCreateView('form')}
          />
          <Radio
            name="create-type-radio"
            label={t('YAML')}
            id="create-type-radio-yaml"
            isChecked={createView === 'yaml'}
            onChange={() => setCreateView('yaml')}
          />
        </FormGroup>
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
                  <HelperTextItem>{t('Unique name of the HTTPRoute')}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <ParentReferencesSelect
              parentRefs={parentRefs}
              onChange={setParentRefs}
              isDisabled={formDisabled}
            />

            <FormGroup label={t('Hostnames')} fieldId="hostnames">
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
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{t('Hostnames for this HTTPRoute')}</HelperTextItem>
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
                  <div>{t('Rules')}</div>
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
                <Table aria-label={t('Rules table')} variant="compact" borders={false}>
                  <Thead>
                    <Tr>
                      <Th width={15}>{t('Rule ID')}</Th>
                      <Th width={25}>{t('Matches')}</Th>
                      <Th width={20}>{t('Filters')}</Th>
                      <Th width={30}>{t('Backend references')}</Th>
                      <Th width={10}>{t('Actions')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {rules.map((rule, index) => (
                      <Tr key={index}>
                        <Td dataLabel={t('Rule ID')}>
                          <strong>{rule.id}</strong>
                        </Td>
                        <Td dataLabel={t('Matches')}>
                          <span style={{ color: rule.matches?.length > 0 ? 'inherit' : '#666' }}>
                            {formatMatchesForDisplay(rule.matches)}
                          </span>
                        </Td>
                        <Td dataLabel={t('Filters')}>
                          {rule.filters && rule.filters.length > 0 ? (
                            <div>
                              {rule.filters.map((filter, idx) => (
                                <div key={idx}>{filter}</div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#666' }}>—</span>
                          )}
                        </Td>
                        <Td dataLabel={t('Backend references')}>
                          <div>
                            <strong>{rule.serviceName}:</strong> {rule.servicePort}
                          </div>
                        </Td>
                        <Td dataLabel={t('Actions')}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button
                              variant="plain"
                              onClick={() => handleEditRule(index)}
                              aria-label={t('Edit rule')}
                            >
                              <EditIcon />
                            </Button>
                            <Button
                              variant="plain"
                              onClick={() => handleRemoveRule(index)}
                              isDanger
                              aria-label={t('Delete rule')}
                            >
                              <TrashIcon />
                            </Button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}

              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t('Rules define how to route HTTP requests to backend services')}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <ActionGroup className="pf-u-mt-0">
              <HTTPRouteCreateUpdate
                httpRouteResource={httpRoute}
                formValidation={formValidation()}
                httpRouteModel={httpRouteModel}
                ns={selectedNamespace}
                isEdit={isEdit}
              />
              <Button variant="link" onClick={handleCancelResource}>
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </Form>
        </PageSection>
      ) : (
        <React.Suspense fallback={<div>{t('Loading...')}</div>}>
          <ResourceYAMLEditor
            initialResource={httpRoute}
            create={!isEdit}
            onChange={handleYAMLChange}
          />
        </React.Suspense>
      )}
      <Modal
        variant="large"
        title={editingRuleIndex !== null ? t('Edit Rule') : t('Add Rule')}
        isOpen={isRuleModalOpen}
      >
        <Wizard
          onClose={handleRuleModalClose}
          onSave={handleRuleSave}
          height="700px"
          header={
            <WizardHeader
              title="Wizard in modal"
              titleId="wiz-modal-demo-title"
              description="Simple wizard description"
              descriptionId="wiz-modal-demo-description"
              closeButtonAriaLabel="Close wizard"
              onClose={handleRuleModalClose}
            />
          }
        >
          {ruleWizardSteps.map((step, index) => (
            <WizardStep
              key={index}
              name={step.name}
              id={`rule-step-${index}`}
              footer={{
                nextButtonText: step.nextButtonText,
                ...(index === 0
                  ? {
                      isNextDisabled: !isMatchesValid,
                    }
                  : index === 1
                  ? {
                      isNextDisabled: !isBackendRefsValid,
                    }
                  : {}),
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

export default HTTPRouteCreatePage;
