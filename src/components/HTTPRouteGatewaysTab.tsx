import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Alert,
} from '@patternfly/react-core';
import {
  useK8sWatchResources,
  K8sResourceCommon,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';

import extractResourceNameFromURL from '../utils/nameFromPath';

const HTTPRouteGatewaysTab: React.FC = () => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [activeNamespace] = useActiveNamespace();
  const location = useLocation();
  interface HTTPRoute extends K8sResourceCommon {
    spec?: {
      parentRefs?: Array<{ name: string; namespace?: string }>;
    };
    status?: {
      parents?: Array<{
        parentRef: {
          name: string;
          namespace?: string;
        };
        conditions?: Array<{
          type: string;
          status: string;
        }>;
      }>;
    };
  }
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

  const watchedResources = useK8sWatchResources<{
    httpRoute: HTTPRoute;
  }>(resources);

  const {
    loaded: httpRouteLoaded,
    data: httpRoute,
    loadError: httpRouteError,
  } = watchedResources.httpRoute;

  const gatewayTargets = React.useMemo(() => {
    if (!httpRoute) {
      return [];
    }
    let parentRefs = [];
    parentRefs = httpRoute.status?.parents
      .filter((parent) => {
        const isAccepted = parent.conditions?.some(
          (condition) => condition.type === 'Accepted' && condition.status === 'True',
        );
        return isAccepted;
      })
      .map((parent) => parent.parentRef);
    const targets = parentRefs.map((ref) => ({
      name: ref.name,
      namespace: ref.namespace || httpRoute.metadata?.namespace,
    }));
    return targets;
  }, [httpRoute]);

  const gatewayResources = React.useMemo(() => {
    const resources: any = {};

    gatewayTargets.forEach((target, index) => {
      resources[`gateway-${index}`] = {
        groupVersionKind: {
          group: 'gateway.networking.k8s.io',
          version: 'v1',
          kind: 'Gateway',
        },
        namespace: target.namespace,
        name: target.name,
        isList: false,
      };
    });

    console.log(
      `Loading ${Object.keys(resources).length} specific Gateways:`,
      gatewayTargets.map((t) => `${t.namespace}/${t.name}`),
    );

    return resources;
  }, [gatewayTargets]);

  const gatewayWatch = useK8sWatchResources(gatewayResources);

  const relatedGateways = React.useMemo(() => {
    const gateways: K8sResourceCommon[] = [];

    Object.values(gatewayWatch).forEach((watch, index) => {
      if (watch.loaded && !watch.loadError && watch.data) {
        gateways.push(watch.data as K8sResourceCommon);
      } else if (watch.loadError) {
        console.error(`Error loading Gateway ${index}:`, watch.loadError.message);
      }
    });

    return gateways;
  }, [gatewayWatch]);
  const gatewaysLoaded = React.useMemo(() => {
    return Object.values(gatewayWatch).every((watch) => watch.loaded);
  }, [gatewayWatch]);

  const gatewaysError = React.useMemo(() => {
    return Object.values(gatewayWatch).find((watch) => watch.loadError)?.loadError;
  }, [gatewayWatch]);

  const loading = !httpRouteLoaded || !gatewaysLoaded;
  const error = httpRouteError || gatewaysError;

  if (loading) {
    return (
      <PageSection>
        <Spinner size="lg" />
        <div className="pf-v5-u-mt-md">{t('Loading associated gateways...')}</div>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection>
        <Alert variant="danger" title={t('Error loading gateways')}>
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  if (relatedGateways.length === 0) {
    return (
      <PageSection>
        <EmptyState>
          <Title headingLevel="h4" size="lg">
            {t('No associated Gateways found')}
          </Title>
          <EmptyStateBody>
            {t('This HTTPRoute is not associated with any Gateways through parentRefs.')}
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <Page>
      <PageSection>
        <Title headingLevel="h2" className="pf-v5-u-mb-lg">
          {t('Associated Gateways')} ({relatedGateways.length})
        </Title>
        <div>
          {relatedGateways.map((gateway, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                margin: '10px 0',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
              }}
            >
              <h4>
                {gateway.metadata.namespace}/{gateway.metadata.name}
              </h4>
              <p>
                <strong>Namespace:</strong> {gateway.metadata.namespace}
              </p>
              <p>
                <strong>Name:</strong> {gateway.metadata.name}
              </p>
              <p>
                <strong>Gateway Class:</strong> {(gateway as any).spec?.gatewayClassName || 'N/A'}
              </p>
              <p>
                <strong>Listeners:</strong> {(gateway as any).spec?.listeners?.length || 0}
              </p>
              <p>
                <strong>Status:</strong> Accepted (loaded from status.parents)
              </p>
            </div>
          ))}
        </div>
      </PageSection>
    </Page>
  );
};
export default HTTPRouteGatewaysTab;
