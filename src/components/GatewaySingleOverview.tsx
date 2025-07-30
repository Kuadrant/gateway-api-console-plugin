import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { PageSection, Title } from '@patternfly/react-core';
import { useLocation } from 'react-router-dom';
import GatewayTabProvider from './GatewayTabProvider';
import {
  useK8sWatchResources,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';

import extractResourceNameFromURL from '../utils/nameFromPath';

const GatewayPoliciesPage: React.FC = () => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [activeNamespace] = useActiveNamespace();
  const location = useLocation();

  const routeName = extractResourceNameFromURL(location.pathname);
  const resources = {
    gateway: {
      groupVersionKind: {
        group: 'gateway.networking.k8s.io',
        version: 'v1',
        kind: 'Gateway',
      },
      namespace: activeNamespace,
      name: routeName,
      isList: false,
    },
  };

  const watchedResources = useK8sWatchResources<{ gateway: K8sResourceCommon }>(resources);
  const { loaded, loadError, data: httpRoute } = watchedResources.gateway;

  console.log('HHTPROUTE', httpRoute);

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">{t('Gateway Console Plugin')}</title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <Title headingLevel="h2">{t('Attached Resources')}</Title>
        {!loaded ? (
          <div>Loading...</div>
        ) : loadError ? (
          <div>Error loading Gateway: {loadError.message}</div>
        ) : (
          <GatewayTabProvider resource={httpRoute} />
        )}
      </PageSection>
    </>
  );
};

export default GatewayPoliciesPage;
