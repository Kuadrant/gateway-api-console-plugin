import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { PageSection } from '@patternfly/react-core';
import {
  useK8sWatchResources,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';

import extractResourceNameFromURL from '../utils/nameFromPath';
import AttachedResources from './AttachedResources';

const HTTPRouteSingleOverview: React.FC = () => {
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
      <PageSection hasBodyWrapper={false}>
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
