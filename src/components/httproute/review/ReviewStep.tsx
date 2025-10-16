import * as React from 'react';
import {
  Form,
  Title,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  Alert,
  AlertVariant,
  AlertActionLink,
  ExpandableSection,
  List,
  ListItem,
} from '@patternfly/react-core';
import { validateCompleteRule } from './reviewValidation';
import { getFilterSummary } from '../filters/filterUtils';

interface ReviewStepProps {
  currentRule: any;
  t: (key: string) => string;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ currentRule, t }) => {
  const hasMatches = currentRule.matches?.length > 0;
  const hasFilters = currentRule.filters?.length > 0;
  const hasBackendRefs = currentRule.backendRefs?.length > 0;
  const validationResult = React.useMemo(() => {
    return validateCompleteRule(currentRule);
  }, [currentRule]);

  const isRuleValid = validationResult.isValid;
  const formatFilterSummary = (filter: any): React.ReactNode => {
    const summary = getFilterSummary(filter);

    if (!summary || summary === 'Filter') {
      return <div>{filter.type || 'Unknown Filter'}</div>;
    }

    const parts = summary.split(' — ');
    const filterName = parts[0]; // "RequestHeaderModifier"
    const details = parts[1];

    return (
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{filterName}</div>

        {details && (
          <div style={{ marginLeft: '8px' }}>
            {details.split(' | Type:').map((detail, idx) => {
              const formattedDetail = idx === 0 ? detail : `Type:${detail}`;

              return (
                <div key={idx} style={{ fontSize: '14px', color: '#666', marginBottom: '2px' }}>
                  {formattedDetail}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Form>
      <Title headingLevel="h3">{t('Review and create')}</Title>

      {!isRuleValid && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          title={t('Rule incomplete')}
          style={{ marginBottom: 16 }}
          actionLinks={
            <React.Fragment>
              <AlertActionLink onClick={() => console.log('Restart configuration')}>
                {t('Restart configuration')}
              </AlertActionLink>
              <AlertActionLink
                component="a"
                href="https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.HTTPRoute"
              >
                {t('Learn more')}
              </AlertActionLink>
            </React.Fragment>
          }
        >
          <p>
            {validationResult.errors.length > 0
              ? t('This rule has validation errors that must be fixed before creation.')
              : t(
                  'This rule cannot be created until it includes at least one match, filter, or backend reference.',
                )}
          </p>
          {validationResult.errors.length > 0 && (
            <ExpandableSection
              toggleText={t('Show detailed errors')}
              isIndented
              style={{ marginTop: '12px' }}
            >
              <List>
                {validationResult.errors.map((error, index) => (
                  <ListItem key={index}>{error.message}</ListItem>
                ))}
              </List>
            </ExpandableSection>
          )}
        </Alert>
      )}
      {validationResult.warnings.length > 0 && validationResult.errors.length === 0 && (
        <Alert
          variant={AlertVariant.warning}
          isInline
          title={t('Validation warnings')}
          style={{ marginBottom: 16 }}
        >
          <ExpandableSection toggleText={t('Show warnings')} isIndented>
            <List>
              {validationResult.warnings.map((warning, index) => (
                <ListItem key={index}>{warning.message}</ListItem>
              ))}
            </List>
          </ExpandableSection>
        </Alert>
      )}

      <DescriptionList
        isHorizontal
        horizontalTermWidthModifier={{
          default: '5ch',
          sm: '10ch',
          md: '10ch',
          lg: '10ch',
          xl: '10ch',
          '2xl': '17ch',
        }}
      >
        {/* Rule ID */}
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Rule ID')}</DescriptionListTerm>
          <DescriptionListDescription>{currentRule.id}</DescriptionListDescription>
        </DescriptionListGroup>

        {/* Matches */}
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Matches')}</DescriptionListTerm>
          <DescriptionListDescription>
            {hasMatches ? (
              <div>
                {currentRule.matches.map((match, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {match.pathType || 'PathPrefix'} | {match.pathValue || '/'} |{' '}
                    {match.method || 'GET'}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#666' }}>—</span>
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>

        {/* Filters */}
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Filters')}</DescriptionListTerm>
          <DescriptionListDescription>
            {hasFilters ? (
              <div>
                {currentRule.filters.map((filter, index) => (
                  <div key={index} style={{ marginBottom: '6px' }}>
                    {formatFilterSummary(filter)}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#666' }}>—</span>
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>

        {/* Backend Service */}
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Backend Service')}</DescriptionListTerm>
          <DescriptionListDescription>
            {hasBackendRefs ? (
              <div>
                {currentRule.backendRefs.map((backend, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {backend.serviceName} | {backend.port} | {`${backend.weight} weight`}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#666' }}>—</span>
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </Form>
  );
};

export default ReviewStep;
