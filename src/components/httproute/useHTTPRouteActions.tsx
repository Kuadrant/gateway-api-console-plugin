import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { ExtensionHookResult } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Action } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/actions';
import {
  K8sResourceCommon,
  useK8sModel,
  getGroupVersionKindForResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { AccessReviewResourceAttributes } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/console-types';
import {
  useAnnotationsModal,
  useDeleteModal,
  useLabelsModal,
} from '@openshift-console/dynamic-plugin-sdk';

const useHTTPRouteActions = (obj: K8sResourceCommon): ExtensionHookResult<Action[]> => {
  const history = useHistory();
  const gvk = obj ? getGroupVersionKindForResource(obj) : undefined;
  const [httpRouteModel] = useK8sModel(
    gvk
      ? { group: gvk.group, version: gvk.version, kind: gvk.kind }
      : { group: '', version: '', kind: '' },
  );
  const launchDeleteModal = useDeleteModal(obj);
  const launchLabelsModal = useLabelsModal(obj);
  const launchAnnotationsModal = useAnnotationsModal(obj);

  const actions = React.useMemo<Action[]>(() => {
    if (!obj || obj.kind !== 'HTTPRoute') return [];
    const api = (obj.apiVersion || '').replace('/', '~');
    const namespace = obj.metadata?.namespace || 'default';
    const name = obj.metadata?.name || '';

    const updateAccess: AccessReviewResourceAttributes | undefined = httpRouteModel
      ? {
          group: httpRouteModel.apiGroup,
          resource: httpRouteModel.plural,
          verb: 'update',
          name,
          namespace,
        }
      : undefined;
    const deleteAccess: AccessReviewResourceAttributes | undefined = httpRouteModel
      ? {
          group: httpRouteModel.apiGroup,
          resource: httpRouteModel.plural,
          verb: 'delete',
          name,
          namespace,
        }
      : undefined;

    const actionsList: Action[] = [
      {
        id: 'edit-labels-httproute',
        label: 'Edit labels',
        cta: launchLabelsModal,
        accessReview: updateAccess,
      },
      {
        id: 'edit-annotations-httproute',
        label: 'Edit annotations',
        cta: launchAnnotationsModal,
        accessReview: updateAccess,
      },
      {
        id: 'kuadrant-http-route-edit-form',
        label: 'Edit',
        description: 'Edit via form',
        cta: () =>
          history.push({
            pathname: `/k8s/ns/${namespace}/${api}~HTTPRoute/${name}/edit`,
          }),
        insertBefore: 'edit-yaml',
        accessReview: updateAccess,
      },
      {
        id: 'delete-httproute',
        label: 'Delete',
        cta: launchDeleteModal,
        accessReview: deleteAccess,
      },
    ];

    return actionsList;
  }, [history, obj, httpRouteModel, launchAnnotationsModal, launchDeleteModal, launchLabelsModal]);

  return [actions, true, undefined];
};

export default useHTTPRouteActions;
