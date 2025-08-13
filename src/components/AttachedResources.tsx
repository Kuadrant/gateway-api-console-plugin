import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertGroup,
  EmptyState,
  EmptyStateBody,
  InputGroup,
  MenuToggle,
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

          const statusMatch = statusParents.some((parent: any) =>
            checkParentRef(parent.parentRef, resource),
          );
          return statusMatch;
        });
        results = results.concat(matchingRoutes);
      }
    }

    if (resource.kind === 'HTTPRoute') {
      const gateways = watchedResources.Gateway;
      if (gateways?.loaded && !gateways.loadError && gateways.data) {
        const matchingGateways = gateways.data.filter((gateway) => {
          const statusParents = resource.status?.parents ?? [];
          const statusMatch = statusParents.some((parent: any) =>
            checkParentRef(parent.parentRef, gateway),
          );
          return statusMatch;
        });
        results = results.concat(matchingGateways);
      }
    }

    return results;
  }, [watchedResources, resource, resourceGroup]);

  const [filters, setFilters] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterSelected, setFilterSelected] = React.useState('Name');
  const [filteredResources, setFilteredResources] = React.useState<K8sResourceKind[]>([]);

  React.useEffect(() => {
    let data = attachedResources;
    if (filters) {
      const filterValue = filters.toLowerCase();
      data = data.filter((res) => {
        if (filterSelected === 'Name') {
          return res.metadata.name?.toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Kind') {
          return res.kind?.toLowerCase().includes(filterValue);
        } else if (filterSelected === 'Namespace') {
          return res.metadata.namespace?.toLowerCase().includes(filterValue);
        }
        return true;
      });
    }
    setFilteredResources(data);
  }, [attachedResources, filters, filterSelected]);

  const columns: TableColumn<K8sResourceKind>[] = [
    { title: t('Name'), id: 'name', sort: 'metadata.name' },
    { title: t('Kind'), id: 'kind', sort: 'kind' },
    { title: t('Namespace'), id: 'namespace', sort: 'metadata.namespace' },
    { title: t('Status'), id: 'status' },
  ];

  const AttachedResourcesRow: React.FC<RowProps<K8sResourceKind>> = ({ obj, activeColumnIDs }) => {
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
            case 'kind':
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

      {attachedResources.length > 0 && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <Select
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsOpen(!isOpen)}
                      isExpanded={isOpen}
                    >
                      {filterSelected}
                    </MenuToggle>
                  )}
                  onSelect={(_e, selection) => {
                    setFilterSelected(selection as string);
                    setIsOpen(false);
                  }}
                  onOpenChange={setIsOpen}
                  isOpen={isOpen}
                >
                  {['Name', 'Kind', 'Namespace'].map((option) => (
                    <SelectOption key={option} value={option}>
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
                    onChange={(_event, value) => setFilters(value)}
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

      {filteredResources.length === 0 && allLoaded ? (
        <EmptyState
          titleText={
            <Title headingLevel="h4" size="lg">
              {filters ? t('No matching resources found') : t('No attached resources found')}
            </Title>
          }
          icon={SearchIcon}
        >
          <EmptyStateBody>
            {filters
              ? t('Try adjusting your search criteria')
              : t('This resource has no related items configured')}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <VirtualizedTable<K8sResourceKind>
          data={filteredResources}
          unfilteredData={attachedResources}
          loaded={allLoaded}
          loadError={combinedLoadError}
          columns={columns}
          Row={AttachedResourcesRow}
        />
      )}
    </div>
  );
};

export default AttachedResources;
