import * as React from 'react';
import {
  FormGroup,
  Form,
  Button,
  FormSelect,
  FormSelectOption,
  TextInput,
  ButtonVariant,
  Tabs,
  Tab,
  TabTitleText,
  TabContent,
  TabContentBody,
  Tooltip,
  ExpandableSection,
} from '@patternfly/react-core';
import {
  HTTPRouteMatch,
  HTTPRouteHeader,
  HTTPRouteQueryParam,
  MatchesWizardStepProps,
} from './MatchesTypes';

import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';

export const MatchesWizardStep: React.FC<MatchesWizardStepProps> = ({
  currentRule,
  setCurrentRule,
  t,
}) => {
  const [activeMatchTab, setActiveMatchTab] = React.useState(0);

  const handleAddMatch = () => {
    const newMatch: HTTPRouteMatch = {
      id: `match-${Date.now().toString(36)}`,
      pathType: '',
      pathValue: '/',
      method: '',
      headers: [],
      queryParams: [],
    };

    const updatedMatches = [...currentRule.matches, newMatch];
    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });

    // Switch to a new tab
    setActiveMatchTab(updatedMatches.length - 1);
  };

  const handleMatchTabSelect = (event: any, tabIndex: number) => {
    setActiveMatchTab(tabIndex);
  };

  const handleRemoveMatch = (matchIndex: number) => {
    const updatedMatches = currentRule.matches.filter((_, i) => i !== matchIndex);
    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });
    // Adjust the active tab
    if (activeMatchTab >= updatedMatches.length && updatedMatches.length > 0) {
      setActiveMatchTab(updatedMatches.length - 1);
    } else if (updatedMatches.length === 0) {
      setActiveMatchTab(0);
    }
  };

  const handleAddHeader = (matchIndex: number) => {
    const newHeader: HTTPRouteHeader = {
      id: `header-${Date.now().toString(36)}`,
      type: 'Exact',
      name: '',
      value: '',
    };

    const updatedMatches = [...currentRule.matches];
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      headers: [...(updatedMatches[matchIndex].headers || []), newHeader],
    };

    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });
  };

  const handleAddQueryParam = (matchIndex: number) => {
    const newQueryParam: HTTPRouteQueryParam = {
      id: `queryparam-${Date.now().toString(36)}`,
      type: 'Exact',
      name: '',
      value: '',
    };

    const updatedMatches = [...currentRule.matches];
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      queryParams: [...(updatedMatches[matchIndex].queryParams || []), newQueryParam],
    };

    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });
  };

  const handleQueryParamChange = (
    matchIndex: number,
    queryParamId: string,
    field: keyof HTTPRouteQueryParam,
    value: string,
  ) => {
    const updatedMatches = [...currentRule.matches];
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      queryParams: (updatedMatches[matchIndex].queryParams || []).map((queryParam) =>
        queryParam.id === queryParamId ? { ...queryParam, [field]: value } : queryParam,
      ),
    };

    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });
  };

  const handleRemoveQueryParam = (matchIndex: number, queryParamId: string) => {
    const updatedMatches = [...currentRule.matches];
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      queryParams: (updatedMatches[matchIndex].queryParams || []).filter(
        (queryParam) => queryParam.id !== queryParamId,
      ),
    };

    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });
  };

  const handleHeaderChange = (
    matchIndex: number,
    headerId: string,
    field: keyof HTTPRouteHeader,
    value: string,
  ) => {
    const updatedMatches = [...currentRule.matches];
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      headers: (updatedMatches[matchIndex].headers || []).map((header) =>
        header.id === headerId ? { ...header, [field]: value } : header,
      ),
    };

    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });
  };

  const handleRemoveHeader = (matchIndex: number, headerId: string) => {
    const updatedMatches = [...currentRule.matches];
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      headers: (updatedMatches[matchIndex].headers || []).filter(
        (header) => header.id !== headerId,
      ),
    };

    setCurrentRule({
      ...currentRule,
      matches: updatedMatches,
    });
  };

  return (
    <Form>
      {/* If there are no matches, we show an empty state */}
      {currentRule.matches.length === 0 ? (
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ marginBottom: '16px', fontSize: '24px' }}>{t('Matches')}</h1>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            {t(
              'Defines the criteria for a request to match this rule. If multiple matches are specified, they are OR ed. If omitted, this rule matches all requests. Multiple Matches in one Rule share all BackendRefs.',
            )}
          </p>
          <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAddMatch}>
            {t('Add match')}
          </Button>
        </div>
      ) : (
        // If there are matches - show tabs
        <div>
          <div style={{ marginBottom: '10px' }}>
            <h1 style={{ marginBottom: '16px', fontSize: '24px' }}>{t('Matches')}</h1>
            <p style={{ marginBottom: '10px', color: '#666' }}>
              {t(
                'Defines the criteria for a request to match this rule. If multiple matches are specified, they are OR ed. If omitted, this rule matches all requests.',
              )}
            </p>
          </div>

          <Tabs activeKey={activeMatchTab} onSelect={handleMatchTabSelect} onAdd={handleAddMatch}>
            {currentRule.matches.map((match, index) => (
              <Tab
                key={match.id}
                eventKey={index}
                title={
                  <Tooltip
                    position="top"
                    content={
                      <div>
                        {match.pathType || 'empty'} {t('    |    ')} {match.pathValue || 'empty'}
                        {t('  |  ')} {match.method || 'empty'}
                      </div>
                    }
                  >
                    <TabTitleText>Match-{index + 1}</TabTitleText>
                  </Tooltip>
                }
                tabContentId={`match-content-${index}`}
              />
            ))}
          </Tabs>

          {/* Tab Contents */}
          {currentRule.matches.map((match, index) => (
            <TabContent
              key={match.id}
              eventKey={index}
              id={`match-content-${index}`}
              activeKey={activeMatchTab}
              hidden={index !== activeMatchTab}
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
                    {
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginBottom: '16px',
                        }}
                      >
                        <Tooltip position={'left'} content={<div>Delete it permanently</div>}>
                          <Button variant="secondary" onClick={() => handleRemoveMatch(index)}>
                            {t('Delete')}
                          </Button>
                        </Tooltip>
                      </div>
                    }
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <FormGroup label={t('Path type')} isRequired fieldId={`path-type-${index}`}>
                        <FormSelect
                          value={match.pathType}
                          onChange={(_, value) => {
                            const updatedMatches = [...currentRule.matches];
                            updatedMatches[index] = { ...match, pathType: value };
                            setCurrentRule({ ...currentRule, matches: updatedMatches });
                          }}
                          aria-label={t('Select path type')}
                        >
                          <FormSelectOption value="" label="Select ..." />
                          <FormSelectOption value="PathPrefix" label="PathPrefix" />
                          <FormSelectOption value="Exact" label="Exact" />
                          <FormSelectOption value="RegularExpression" label="RegularExpression" />
                        </FormSelect>
                      </FormGroup>

                      <FormGroup label={t('Path value')} fieldId={`path-value-${index}`}>
                        <TextInput
                          value={match.pathValue}
                          onChange={(_, value) => {
                            value = '/' + value.replace(/^\/+/, '');

                            const updatedMatches = [...currentRule.matches];
                            updatedMatches[index] = { ...match, pathValue: value };
                            setCurrentRule({ ...currentRule, matches: updatedMatches });
                          }}
                          placeholder="/products"
                        />
                      </FormGroup>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <FormGroup
                        label={t('HTTP method')}
                        isRequired
                        fieldId={`http-method-${index}`}
                      >
                        <FormSelect
                          value={match.method}
                          onChange={(_, value) => {
                            const updatedMatches = [...currentRule.matches];
                            updatedMatches[index] = { ...match, method: value };
                            setCurrentRule({ ...currentRule, matches: updatedMatches });
                          }}
                          aria-label={t('Select HTTP method')}
                        >
                          <FormSelectOption value="" label="Select..." />
                          <FormSelectOption value="GET" label="GET" />
                          <FormSelectOption value="POST" label="POST" />
                          <FormSelectOption value="PUT" label="PUT" />
                          <FormSelectOption value="DELETE" label="DELETE" />
                          <FormSelectOption value="PATCH" label="PATCH" />
                        </FormSelect>
                      </FormGroup>
                    </div>
                  </div>
                </div>

                {/* Headers Section */}
                <ExpandableSection
                  toggleText={(() => {
                    const completedHeaders = (match.headers || []).filter(
                      (h) => h.name && h.value && h.name.trim() !== '' && h.value.trim() !== '',
                    );
                    return completedHeaders.length > 0
                      ? `${t('Headers')} (${completedHeaders.length})`
                      : t('Headers');
                  })()}
                  onToggle={(_, isExpanded) => {
                    if (isExpanded && (!match.headers || match.headers.length === 0)) {
                      handleAddHeader(index);
                    }
                  }}
                  style={{ marginBottom: '13px' }}
                  className="pf-u-mt-md"
                >
                  {(match.headers || []).map((header) => (
                    <div
                      key={header.id}
                      className="pf-v5-c-form__group-control"
                      style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                    >
                      <FormSelect
                        value={header.type}
                        onChange={(_, value) => handleHeaderChange(index, header.id, 'type', value)}
                        aria-label={t('Select header type')}
                        style={{ minWidth: '140px' }}
                      >
                        <FormSelectOption value="Exact" label="Exact" />
                        <FormSelectOption value="RegularExpression" label="RegularExpression" />
                      </FormSelect>
                      <TextInput
                        type="text"
                        placeholder={t('Header name')}
                        value={header.name}
                        onChange={(_, value) => handleHeaderChange(index, header.id, 'name', value)}
                      />
                      <TextInput
                        type="text"
                        placeholder={t('Header value')}
                        value={header.value}
                        onChange={(_, value) =>
                          handleHeaderChange(index, header.id, 'value', value)
                        }
                      />
                      <Button
                        variant={ButtonVariant.plain}
                        onClick={() => handleRemoveHeader(index, header.id)}
                        aria-label="Remove header"
                      >
                        <MinusCircleIcon />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant={ButtonVariant.link}
                    icon={<PlusCircleIcon />}
                    onClick={() => handleAddHeader(index)}
                    isInline
                  >
                    {t('Add more')}
                  </Button>
                </ExpandableSection>

                {/* QueryParams Section */}
                <ExpandableSection
                  toggleText={(() => {
                    const completedQueryParams = (match.queryParams || []).filter(
                      (q) => q.name && q.value && q.name.trim() !== '' && q.value.trim() !== '',
                    );
                    return completedQueryParams.length > 0
                      ? `${t('Query Params')} (${completedQueryParams.length})`
                      : t('Query Params');
                  })()}
                  onToggle={(_, isExpanded) => {
                    if (isExpanded && (!match.queryParams || match.queryParams.length === 0)) {
                      handleAddQueryParam(index);
                    }
                  }}
                  className="pf-u-mt-md"
                >
                  {(match.queryParams || []).map((queryParam) => (
                    <div
                      key={queryParam.id}
                      className="pf-v5-c-form__group-control"
                      style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                    >
                      <FormSelect
                        value={queryParam.type}
                        onChange={(_, value) =>
                          handleQueryParamChange(index, queryParam.id, 'type', value)
                        }
                        aria-label={t('Select query param type')}
                        style={{ minWidth: '140px' }}
                      >
                        <FormSelectOption value="Exact" label="Exact" />
                        <FormSelectOption value="RegularExpression" label="RegularExpression" />
                      </FormSelect>
                      <TextInput
                        type="text"
                        placeholder={t('Query param name')}
                        value={queryParam.name}
                        onChange={(_, value) =>
                          handleQueryParamChange(index, queryParam.id, 'name', value)
                        }
                      />
                      <TextInput
                        type="text"
                        placeholder={t('Query param value')}
                        value={queryParam.value}
                        onChange={(_, value) =>
                          handleQueryParamChange(index, queryParam.id, 'value', value)
                        }
                      />
                      <Button
                        variant={ButtonVariant.plain}
                        onClick={() => handleRemoveQueryParam(index, queryParam.id)}
                        aria-label="Remove query param"
                      >
                        <MinusCircleIcon />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant={ButtonVariant.link}
                    icon={<PlusCircleIcon />}
                    onClick={() => handleAddQueryParam(index)}
                    isInline
                  >
                    {t('Add more')}
                  </Button>
                </ExpandableSection>
              </TabContentBody>
            </TabContent>
          ))}
        </div>
      )}
    </Form>
  );
};

export const validateMatchesStep = (currentRule: { matches: HTTPRouteMatch[] }): boolean => {
  if (currentRule.matches.length === 0) {
    return true;
  }
  return currentRule.matches.every(
    (match) => match.pathType && match.pathType !== '' && match.method && match.method !== '',
  );
};
