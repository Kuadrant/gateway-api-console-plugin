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
      // Search cluster-wide for HTTPRoutes that might reference this gateway
    },
  };

  const watchedResources = useK8sWatchResources<{ [key: string]: K8sResourceKind[] }>(
    associatedResources,
  );

  const resourceGroup = resource.apiVersion.includes('/') ? resource.apiVersion.split('/')[0] : '';

  const attachedRoutes = React.useMemo(() => {
    let routesArray: K8sResourceKind[] = [];

    // Process HTTPRoutes
    const httpRoutes = watchedResources.HTTPRoute;
    console.log('HTTPROUTES', httpRoutes);

    if (httpRoutes?.loaded && !httpRoutes.loadError && httpRoutes.data) {
      console.log('ALL HTTP ROUTES:', httpRoutes.data);
      const matchingRoutes = (httpRoutes.data as K8sResourceKind[]).filter((route) => {
        console.log('CHECKING ROUTE:', route.metadata.name);
        console.log('ROUTE STATUS:', route.status);

        const statusParents = route.status?.parents ?? [];
        console.log('STATUS PARENTS FOR ROUTE', route.metadata.name, ':', statusParents);

        // Also check spec.parentRefs as fallback for debugging
        const specParents = route.spec?.parentRefs ?? [];
        console.log('SPEC PARENTS FOR ROUTE', route.metadata.name, ':', specParents);

        console.log('LOOKING FOR GATEWAY:', {
          name: resource.metadata.name,
          namespace: resource.metadata.namespace,
          kind: resource.kind,
          group: resourceGroup,
        });

        // Check both status.parents and spec.parentRefs for matches
        const checkParentRef = (parentRef: any) => {
          if (!parentRef) return false;

          const refNamespace = parentRef.namespace ?? resource.metadata.namespace;
          const refGroup = parentRef.group ?? 'gateway.networking.k8s.io';
          const refKind = parentRef.kind ?? 'Gateway';

          const matches =
            parentRef.name === resource.metadata.name &&
            refNamespace === resource.metadata.namespace &&
            refGroup === resourceGroup &&
            refKind === resource.kind;

          console.log('MATCH CHECK:', {
            parentRef,
            expected: {
              name: resource.metadata.name,
              namespace: resource.metadata.namespace,
              group: resourceGroup,
              kind: resource.kind,
            },
            actual: {
              name: parentRef.name,
              namespace: refNamespace,
              group: refGroup,
              kind: refKind,
            },
            matches,
          });

          return matches;
        };

        // First check status.parents
        const statusMatch = statusParents.some((parent: any) => {
          console.log('CHECKING STATUS PARENT REF:', parent.parentRef);
          return checkParentRef(parent.parentRef);
        });

        // Also check spec.parentRefs as fallback
        const specMatch = specParents.some((parentRef: any) => {
          console.log('CHECKING SPEC PARENT REF:', parentRef);
          return checkParentRef(parentRef);
        });

        return statusMatch || specMatch;
      });
      console.log('MATCHING ROUTES:', matchingRoutes);

      routesArray = routesArray.concat(matchingRoutes);
    }

    return routesArray;
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
      {attachedRoutes.length === 0 && allLoaded ? (
        <EmptyState
          titleText={
            <Title headingLevel="h4" size="lg">
              {t('No attached routes found')}
            </Title>
          }
          icon={SearchIcon}
        >
          <EmptyStateBody>{t('No route resources matched')}</EmptyStateBody>
        </EmptyState>
      ) : (
        <VirtualizedTable<K8sResourceKind>
          data={attachedRoutes}
          unfilteredData={attachedRoutes}
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
