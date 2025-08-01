import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { PageSection, Title } from '@patternfly/react-core';
import {
  useK8sWatchResources,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';

import extractResourceNameFromURL from '../utils/nameFromPath';
import { Helmet } from 'react-helmet';
import AttachedResources from './AttachedResources';

const HTTPRouteSingleOverview: React.FC = () => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [activeNamespace] = useActiveNamespace();
  const location = useLocation();

  const httpRouteName = extractResourceNameFromURL(location.pathname);
  const resources = {
    httpRoute: {
      groupVersionKind: {
        group: 'gateway.networking.k8s.io',
        version: 'v1',
        kind: 'HTTPRoute',
      },
      namespace: activeNamespace,
      name: httpRouteName,
      isList: false,
    },
  };

  const watchedResources = useK8sWatchResources<{ httpRoute: K8sResourceCommon }>(resources);
  const { loaded, loadError, data: httpRoute } = watchedResources.httpRoute;

  return (
    <>
      <Helmet>
        <title data-test="example-page-title">{t('Associated Gateways')}</title>
      </Helmet>
      <PageSection hasBodyWrapper={false}>
        <Title headingLevel="h2">{t('Associated Gateways')}</Title>
        {!loaded ? (
          <div>Loading...</div>
        ) : loadError ? (
          <div>Error loading HTTPRoute: {loadError.message}</div>
        ) : (
          <AttachedResources resource={httpRoute} />
        )}
      </PageSection>
    </>
  );
};
export default HTTPRouteSingleOverview;
