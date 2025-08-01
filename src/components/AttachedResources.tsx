import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertGroup,
  EmptyState,
  EmptyStateBody,
  InputGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectOption,
  TextInput,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
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

interface HTTPRoute extends K8sResourceKind {
  spec?: {
    parentRefs?: Array<{ name: string; namespace?: string; group?: string; kind?: string }>;
  };
  status?: {
    parents?: Array<{
      parentRef: { name: string; namespace?: string; group?: string; kind?: string };
      conditions?: Array<{ type: string; status: string }>;
    }>;
  };
}

// resurs type understanding
const getResourceType = (resource: K8sResourceKind): 'gateway' | 'httproute' | 'unknown' => {
  const group = resource.apiVersion.includes('/') ? resource.apiVersion.split('/')[0] : '';

  if (resource.kind === 'Gateway' && group === 'gateway.networking.k8s.io') {
    return 'gateway';
  }
  if (resource.kind === 'HTTPRoute' && group === 'gateway.networking.k8s.io') {
    return 'httproute';
  }
  return 'unknown';
};

const AttachedResources: React.FC<AttachedResourcesProps> = ({ resource }) => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [filters, setFilters] = React.useState<string>('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterSelected, setFilterSelected] = React.useState('Name');
  const [filteredResources, setFilteredResources] = React.useState<K8sResourceKind[]>([]);

  const resourceType = getResourceType(resource);

  //  Gateway -> HTTPRoutes Rach
  const useGatewayToHTTPRoutes = () => {
    const associatedResources: { [key: string]: WatchK8sResource } = {
      HTTPRoute: {
        groupVersionKind: { group: 'gateway.networking.k8s.io', version: 'v1', kind: 'HTTPRoute' },
        isList: true,
      },
    };

    const watchedResources = useK8sWatchResources<{ [key: string]: K8sResourceKind[] }>(
      associatedResources,
    );

    const resourceGroup = resource.apiVersion.includes('/')
      ? resource.apiVersion.split('/')[0]
      : '';

    const attachedRoutes = React.useMemo(() => {
      let routesArray: K8sResourceKind[] = [];

      const httpRoutes = watchedResources.HTTPRoute;
      console.log('HTTPROUTES', httpRoutes);

      if (httpRoutes?.loaded && !httpRoutes.loadError && httpRoutes.data) {
        console.log('ALL HTTP ROUTES:', httpRoutes.data);
        const matchingRoutes = (httpRoutes.data as K8sResourceKind[]).filter((route) => {
          console.log('CHECKING ROUTE:', route.metadata.name);
          console.log('ROUTE STATUS:', route.status);

          const statusParents = route.status?.parents ?? [];
          console.log('STATUS PARENTS FOR ROUTE', route.metadata.name, ':', statusParents);

          const specParents = route.spec?.parentRefs ?? [];
          console.log('SPEC PARENTS FOR ROUTE', route.metadata.name, ':', specParents);

          console.log('LOOKING FOR GATEWAY:', {
            name: resource.metadata.name,
            namespace: resource.metadata.namespace,
            kind: resource.kind,
            group: resourceGroup,
          });

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

          const statusMatch = statusParents.some((parent: any) => {
            console.log('CHECKING STATUS PARENT REF:', parent.parentRef);
            return checkParentRef(parent.parentRef);
          });

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

    return {
      attachedResources: attachedRoutes,
      watchedResources,
      allLoaded: Object.values(watchedResources).every((res) => res.loaded),
    };
  };

  //  HTTPRoute -> Gateways Anton
  const useHTTPRouteToGateways = () => {
    const gatewayTargets = React.useMemo(() => {
      const httpRoute = resource as HTTPRoute;

      let parentRefs: Array<{ name: string; namespace?: string; group?: string; kind?: string }> =
        [];

      if (httpRoute.status?.parents) {
        parentRefs = httpRoute.status.parents.map((parent) => parent.parentRef);
      } else if (httpRoute.spec?.parentRefs) {
        parentRefs = httpRoute.spec.parentRefs;
      }

      console.log('PARENT REFS FROM HTTPROUTE:', parentRefs);

      const gatewayRefs = parentRefs.filter((ref) => {
        const refKind = ref.kind || 'Gateway';
        const refGroup = ref.group || 'gateway.networking.k8s.io';
        return refKind === 'Gateway' && refGroup === 'gateway.networking.k8s.io';
      });

      const targets = gatewayRefs.map((ref) => ({
        name: ref.name,
        namespace: ref.namespace || httpRoute.metadata.namespace,
      }));

      console.log('GATEWAY TARGETS:', targets);
      return targets;
    }, [resource]);

    const gatewayResources: { [key: string]: WatchK8sResource } = React.useMemo(() => {
      const resources: { [key: string]: WatchK8sResource } = {};

      gatewayTargets.forEach((target, index) => {
        resources[`gateway-${index}`] = {
          groupVersionKind: { group: 'gateway.networking.k8s.io', version: 'v1', kind: 'Gateway' },
          namespace: target.namespace,
          name: target.name,
          isList: false,
        };
      });

      console.log('GATEWAY RESOURCES TO WATCH:', resources);
      return resources;
    }, [gatewayTargets]);

    const watchedResources = useK8sWatchResources<{ [key: string]: K8sResourceKind }>(
      gatewayResources,
    );

    const attachedGateways = React.useMemo(() => {
      const gatewaysArray: K8sResourceKind[] = [];

      console.log('WATCHED GATEWAY RESOURCES:', watchedResources);

      Object.entries(watchedResources).forEach(([key, gatewayWatch]) => {
        if (gatewayWatch?.loaded && !gatewayWatch.loadError && gatewayWatch.data) {
          console.log(`LOADED GATEWAY ${key}:`, gatewayWatch.data);
          gatewaysArray.push(gatewayWatch.data as K8sResourceKind);
        } else if (gatewayWatch?.loadError) {
          console.error(`ERROR LOADING GATEWAY ${key}:`, gatewayWatch.loadError);
        }
      });

      console.log('ALL ATTACHED GATEWAYS:', gatewaysArray);
      return gatewaysArray;
    }, [watchedResources]);

    return {
      attachedResources: attachedGateways,
      watchedResources,
      allLoaded: Object.values(watchedResources).every((res) => res.loaded),
      gatewayTargets,
    };
  };

  // choose type of extraction
  let data = null;

  if (resourceType === 'gateway') {
    data = useGatewayToHTTPRoutes();
  } else if (resourceType === 'httproute') {
    data = useHTTPRouteToGateways();
  }

  let attachedResources: K8sResourceKind[] = [];
  let watchedResources: { [key: string]: any } = {};
  let allLoaded = false;

  if (data !== null) {
    attachedResources = data.attachedResources;
    watchedResources = data.watchedResources;
    allLoaded = data.allLoaded;
  }

  // filtering for all
  const onToggleClick = () => setIsOpen(!isOpen);

  const onFilterSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    selection: string,
  ) => {
    setFilterSelected(selection);
    setIsOpen(false);
  };

  const handleFilterChange = (value: string) => {
    setFilters(value);
  };

  // filtering
  React.useEffect(() => {
    let data = attachedResources;
    if (filters) {
      const filterValue = filters.toLowerCase();
      data = data.filter((obj) => {
        if (filterSelected === 'Name') {
          return obj.metadata.name.toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Namespace') {
          return obj.metadata.namespace?.toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Kind') {
          return obj.kind.toLowerCase().includes(filterValue);
        }
        return true;
      });
    }
    setFilteredResources(data);
  }, [attachedResources, filters, filterSelected]);

  // Name, Namespace, Kind, Status column
  const columns: TableColumn<K8sResourceKind>[] = [
    {
      title: t('plugin__gateway-api-console-plugin~Name'),
      id: 'name',
      sort: 'metadata.name',
    },
    {
      title: t('plugin__gateway-api-console-plugin~Namespace'),
      id: 'namespace',
      sort: 'metadata.namespace',
    },
    {
      title: t('plugin__gateway-api-console-plugin~Kind'),
      id: 'kind',
      sort: 'kind',
    },
    {
      title: t('plugin__gateway-api-console-plugin~Status'),
      id: 'status',
    },
  ];
  const UniversalRow: React.FC<RowProps<K8sResourceKind>> = ({ obj, activeColumnIDs }) => {
    const [group, version] = obj.apiVersion.includes('/')
      ? obj.apiVersion.split('/')
      : ['gateway.networking.k8s.io', obj.apiVersion];

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
            case 'namespace':
              return (
                <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
                  {obj.metadata.namespace || '-'}
                </TableData>
              );
            case 'kind':
              return (
                <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
                  {obj.kind}
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

  const loadErrors = Object.values(watchedResources)
    .filter((res) => res.loadError)
    .map((res) => res.loadError);
  const combinedLoadError =
    loadErrors.length > 0 ? new Error(loadErrors.map((err) => err.message).join('; ')) : null;
  const displayData = filteredResources;

  const getEmptyStateMessages = () => {
    if (resourceType === 'gateway') {
      return {
        title: t('No attached routes found'),
        body: t('No route resources matched'),
      };
    } else if (resourceType === 'httproute') {
      return {
        title: filters ? t('No matching gateways found') : t('No attached gateways found'),
        body: filters
          ? t('Try adjusting your search criteria')
          : data?.gatewayTargets?.length === 0
          ? t('This HTTPRoute has no parentRefs configured')
          : t('Referenced gateways could not be loaded'),
      };
    }
    return {
      title: t('Unsupported resource type'),
      body: t('This component only supports Gateway and HTTPRoute resources'),
    };
  };

  const emptyStateMessages = getEmptyStateMessages();

  if (resourceType === 'unknown') {
    return (
      <EmptyState
        titleText={
          <Title headingLevel="h4" size="lg">
            {emptyStateMessages.title}
          </Title>
        }
        icon={SearchIcon}
      >
        <EmptyStateBody>{emptyStateMessages.body}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div>
      {combinedLoadError && (
        <AlertGroup>
          <Alert
            title={`Error loading attached ${resourceType === 'gateway' ? 'routes' : 'gateways'}`}
            variant="danger"
            isInline
          >
            {combinedLoadError.message}
          </Alert>
        </AlertGroup>
      )}

      {attachedResources.length > 0 && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <Select
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
                      {filterSelected}
                    </MenuToggle>
                  )}
                  onSelect={onFilterSelect}
                  onOpenChange={setIsOpen}
                  isOpen={isOpen}
                >
                  {['Name', 'Namespace', 'Kind'].map((option, index) => (
                    <SelectOption key={index} value={option}>
                      {option}
                    </SelectOption>
                  ))}
                </Select>
              </ToolbarItem>

              <ToolbarItem>
                <InputGroup className="pf-v5-c-input-group co-filter-group">
                  <TextInput
                    type="text"
                    placeholder={t('Search by {{filterValue}}...', {
                      filterValue: filterSelected.toLowerCase(),
                    })}
                    onChange={(_event, value) => handleFilterChange(value)}
                    className="pf-v5-c-form-control co-text-filter-with-icon"
                    aria-label="Resource search"
                    value={filters}
                  />
                </InputGroup>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      )}

      {displayData.length === 0 && allLoaded ? (
        <EmptyState
          titleText={
            <Title headingLevel="h4" size="lg">
              {emptyStateMessages.title}
            </Title>
          }
          icon={SearchIcon}
        >
          <EmptyStateBody>{emptyStateMessages.body}</EmptyStateBody>
        </EmptyState>
      ) : (
        <VirtualizedTable<K8sResourceKind>
          data={displayData}
          unfilteredData={attachedResources}
          loaded={allLoaded}
          loadError={combinedLoadError}
          columns={columns}
          Row={UniversalRow}
        />
      )}
    </div>
  );
};

export default AttachedResources;
