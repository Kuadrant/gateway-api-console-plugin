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

interface ReviewStepProps {
  currentRule: any;
  t: (key: string) => string;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ currentRule, t }) => {
  const hasMatches = currentRule.matches?.length > 0;
  const hasFilters = currentRule.filters?.length > 0;
  const hasBackendService = !!(currentRule.serviceName && currentRule.servicePort > 0);
  const validationResult = React.useMemo(() => {
    return validateCompleteRule(currentRule);
  }, [currentRule]);

  const isRuleValid = validationResult.isValid;

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
                  <ListItem key={index}>
                    <strong>{error.field}:</strong> {error.message}
                  </ListItem>
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
                <ListItem key={index}>
                  <strong>{warning.field}:</strong> {warning.message}
                </ListItem>
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
                    {match.pathType || 'PathPrefix'} {match.pathValue || '/'} |{' '}
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
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {filter.type || 'Unknown Filter'}
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
            {hasBackendService ? (
              <div>
                {currentRule.serviceName}:{currentRule.servicePort}
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
export { validateCompleteRule };
