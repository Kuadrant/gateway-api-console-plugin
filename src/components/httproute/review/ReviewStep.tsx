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
} from '@patternfly/react-core';

interface ReviewStepProps {
  currentRule: any;
  t: (key: string) => string;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ currentRule, t }) => {
  const hasMatches = currentRule.matches?.length > 0;
  const hasFilters = currentRule.filters?.length > 0;
  const hasBackendService = !!(currentRule.serviceName && currentRule.servicePort > 0);

  const isRuleValid = hasMatches || hasFilters || hasBackendService;

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
            {t(
              'This rule cannot be created until it includes at least one match, filter, or backend reference.',
            )}
          </p>
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
