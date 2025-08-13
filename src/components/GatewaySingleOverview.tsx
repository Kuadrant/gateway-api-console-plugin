import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { useLocation } from 'react-router-dom';
import {
  useK8sWatchResources,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';

import extractResourceNameFromURL from '../utils/nameFromPath';
import AttachedResources from './AttachedResources';

const GatewayPoliciesPage: React.FC = () => {
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

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        {!loaded ? (
          <div>Loading...</div>
        ) : loadError ? (
          <div>Error loading Gateway: {loadError.message}</div>
        ) : (
          <AttachedResources resource={httpRoute} />
        )}
      </PageSection>
    </>
  );
};

export default GatewayPoliciesPage;
