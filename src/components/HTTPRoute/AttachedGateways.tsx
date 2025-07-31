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
import { getStatusLabel } from '../../utils/statusLabel';

type AttachedGatewaysProps = {
  resource: K8sResourceKind; // HTTPRoute
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

const AttachedGateways: React.FC<AttachedGatewaysProps> = ({ resource }) => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [filters, setFilters] = React.useState<string>('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterSelected, setFilterSelected] = React.useState('Name');
  const [filteredGateways, setFilteredGateways] = React.useState<K8sResourceKind[]>([]);
  // extract Gateway targets from HTTPRoute
  const gatewayTargets = React.useMemo(() => {
    const httpRoute = resource as HTTPRoute;

    //  status.parents > spec.parentRefs
    let parentRefs: Array<{ name: string; namespace?: string; group?: string; kind?: string }> = [];

    if (httpRoute.status?.parents) {
      parentRefs = httpRoute.status.parents.map((parent) => parent.parentRef);
    } else if (httpRoute.spec?.parentRefs) {
      parentRefs = httpRoute.spec.parentRefs;
    }

    console.log('PARENT REFS FROM HTTPROUTE:', parentRefs);

    // filter only Gateway res
    const gatewayRefs = parentRefs.filter((ref) => {
      const refKind = ref.kind || 'Gateway';
      const refGroup = ref.group || 'gateway.networking.k8s.io';
      return refKind === 'Gateway' && refGroup === 'gateway.networking.k8s.io';
    });

    // create unicorn targets
    const targets = gatewayRefs.map((ref) => ({
      name: ref.name,
      namespace: ref.namespace || httpRoute.metadata.namespace,
    }));

    console.log('GATEWAY TARGETS:', targets);
    return targets;
  }, [resource]);

  // create res for download  Gateway
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

  // take  Gateway
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

  // Search/filter logic
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

  // Filter attached gateways based on search criteria
  React.useEffect(() => {
    let data = attachedGateways;
    if (filters) {
      const filterValue = filters.toLowerCase();
      data = data.filter((gateway) => {
        if (filterSelected === 'Name') {
          return gateway.metadata.name.toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Namespace') {
          return gateway.metadata.namespace?.toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Gateway Class') {
          return gateway.spec?.gatewayClassName?.toLowerCase().includes(filterValue);
        }
        return true;
      });
    }
    setFilteredGateways(data);
  }, [attachedGateways, filters, filterSelected]);

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
      title: t('plugin__gateway-api-console-plugin~Gateway Class'),
      id: 'gatewayclass',
    },
    {
      title: t('plugin__gateway-api-console-plugin~Status'),
      id: 'status',
    },
  ];

  const AttachedGatewayRow: React.FC<RowProps<K8sResourceKind>> = ({ obj, activeColumnIDs }) => {
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
            case 'gatewayclass':
              return (
                <TableData key={column.id} id={column.id} activeColumnIDs={activeColumnIDs}>
                  {obj.spec?.gatewayClassName || '-'}
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
          <Alert title="Error loading attached gateways" variant="danger" isInline>
            {combinedLoadError.message}
          </Alert>
        </AlertGroup>
      )}

      {/* Search Toolbar */}
      {attachedGateways.length > 0 && (
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
                  {['Name', 'Namespace', 'Gateway Class'].map((option, index) => (
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
                    aria-label="Gateway search"
                    value={filters}
                  />
                </InputGroup>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      )}

      {filteredGateways.length === 0 && allLoaded ? (
        <EmptyState
          titleText={
            <Title headingLevel="h4" size="lg">
              {filters ? t('No matching gateways found') : t('No attached gateways found')}
            </Title>
          }
          icon={SearchIcon}
        >
          <EmptyStateBody>
            {filters
              ? t('Try adjusting your search criteria')
              : gatewayTargets.length === 0
              ? t('This HTTPRoute has no parentRefs configured')
              : t('Referenced gateways could not be loaded')}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <VirtualizedTable<K8sResourceKind>
          data={filteredGateways}
          unfilteredData={attachedGateways}
          loaded={allLoaded}
          loadError={combinedLoadError}
          columns={columns}
          Row={AttachedGatewayRow}
        />
      )}
    </div>
  );
};

export default AttachedGateways;
