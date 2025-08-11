import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertGroup, EmptyState, EmptyStateBody, Title } from '@patternfly/react-core';
import {
  K8sResourceKind,
  ResourceLink,
  useK8sWatchResources,
  VirtualizedTable,
  TableData,
  RowProps,
  TableColumn,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { SearchIcon } from '@patternfly/react-icons';
import { getStatusLabel } from '../utils/statusLabel';

type AttachedResourcesProps = {
  resource: K8sResourceKind;
};

const AttachedResources: React.FC<AttachedResourcesProps> = ({ resource }) => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');

  const associatedResources: { [key: string]: WatchK8sResource } = {
    HTTPRoute: {
      groupVersionKind: { group: 'gateway.networking.k8s.io', version: 'v1', kind: 'HTTPRoute' },
      isList: true,
    },
    Gateway: {
      groupVersionKind: { group: 'gateway.networking.k8s.io', version: 'v1', kind: 'Gateway' },
      isList: true,
    },
  };

  const watchedResources = useK8sWatchResources<{ [key: string]: K8sResourceKind[] }>(
    associatedResources,
  );

  const resourceGroup = resource.apiVersion.includes('/') ? resource.apiVersion.split('/')[0] : '';

  const attachedResources = React.useMemo(() => {
    let results: K8sResourceKind[] = [];

    const checkParentRef = (parentRef: any, targetResource: K8sResourceKind) => {
      if (!parentRef) return false;

      const refNamespace = parentRef.namespace ?? targetResource.metadata.namespace;
      const refGroup = parentRef.group ?? 'gateway.networking.k8s.io';
      const refKind = parentRef.kind ?? 'Gateway';

      return (
        parentRef.name === targetResource.metadata.name &&
        refNamespace === targetResource.metadata.namespace &&
        refGroup === resourceGroup &&
        refKind === targetResource.kind
      );
    };

    if (resource.kind === 'Gateway') {
      const httpRoutes = watchedResources.HTTPRoute;
      if (httpRoutes?.loaded && !httpRoutes.loadError && httpRoutes.data) {
        const matchingRoutes = httpRoutes.data.filter((route) => {
          const statusParents = route.status?.parents ?? [];
          const specParents = route.spec?.parentRefs ?? [];

          const statusMatch = statusParents.some((parent: any) =>
            checkParentRef(parent.parentRef, resource),
          );
          const specMatch = specParents.some((parentRef: any) =>
            checkParentRef(parentRef, resource),
          );

          return statusMatch || specMatch;
        });
        results = results.concat(matchingRoutes);
      }
    }

    if (resource.kind === 'HTTPRoute') {
      const gateways = watchedResources.Gateway;
      if (gateways?.loaded && !gateways.loadError && gateways.data) {
        const matchingGateways = gateways.data.filter((gateway) => {
          const specParents = resource.spec?.parentRefs ?? [];

          return specParents.some((parentRef: any) => {
            return (
              parentRef.name === gateway.metadata.name &&
              (parentRef.namespace ?? resource.metadata.namespace) === gateway.metadata.namespace &&
              (parentRef.group ?? 'gateway.networking.k8s.io') === resourceGroup &&
              (parentRef.kind ?? 'Gateway') === gateway.kind
            );
          });
        });
        results = results.concat(matchingGateways);
      }
    }

    return results;
  }, [watchedResources, resource, resourceGroup]);

  const columns: TableColumn<K8sResourceKind>[] = [
    {
      title: t('plugin__gateway-api-console-plugin~Name'),
      id: 'name',
      sort: 'metadata.name',
    },
    {
      title: t('plugin__gateway-api-console-plugin~Type'),
      id: 'type',
      sort: 'kind',
    },
    {
      title: t('plugin__gateway-api-console-plugin~Namespace'),
      id: 'namespace',
      sort: 'metadata.namespace',
    },
    {
      title: t('plugin__gateway-api-console-plugin~Status'),
      id: 'status',
    },
  ];

  const AttachedResourceRow: React.FC<RowProps<K8sResourceKind>> = ({ obj, activeColumnIDs }) => {
    const [group, version] = obj.apiVersion.includes('/')
      ? obj.apiVersion.split('/')
      : ['', obj.apiVersion];
    return (
      <>
        {columns.map((column) => {
          switch (column.id) {
            case 'name':
              return (
                <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
                  <ResourceLink
                    groupVersionKind={{ group, version, kind: obj.kind }}
                    name={obj.metadata.name}
                    namespace={obj.metadata.namespace}
                  />
                </TableData>
              );
            case 'type':
              return (
                <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
                  {obj.kind}
                </TableData>
              );
            case 'namespace':
              return (
                <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
                  {obj.metadata.namespace || '-'}
                </TableData>
              );
            case 'status':
              return (
                <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
                  {getStatusLabel(obj)}
                </TableData>
              );
            default:
              return null;
          }
        })}
      </>
    );
  };

  const allLoaded = Object.values(watchedResources).every((res) => res.loaded);
  const loadErrors = Object.values(watchedResources)
    .filter((res) => res.loadError)
    .map((res) => res.loadError);
  const combinedLoadError =
    loadErrors.length > 0 ? new Error(loadErrors.map((err) => err.message).join('; ')) : null;

  return (
    <div>
      {combinedLoadError && (
        <AlertGroup>
          <Alert title="Error loading attached resources" variant="danger" isInline>
            {combinedLoadError.message}
          </Alert>
        </AlertGroup>
      )}
      {attachedResources.length === 0 && allLoaded ? (
        <EmptyState
          titleText={
            <Title headingLevel="h4" size="lg">
              {t('No attached resources found')}
            </Title>
          }
          icon={SearchIcon}
        >
          <EmptyStateBody>{t('No matching resources found')}</EmptyStateBody>
        </EmptyState>
      ) : (
        <VirtualizedTable<K8sResourceKind>
          data={attachedResources}
          unfilteredData={attachedResources}
          loaded={allLoaded}
          loadError={combinedLoadError}
          columns={columns}
          Row={AttachedResourceRow}
        />
      )}
    </div>
  );
};

export default AttachedResources;
