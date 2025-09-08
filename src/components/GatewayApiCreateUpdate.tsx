import * as React from 'react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertGroup,
  AlertVariant,
  Button,
  PageSection,
  ActionGroup,
} from '@patternfly/react-core';
import { k8sCreate, k8sUpdate } from '@openshift-console/dynamic-plugin-sdk';

interface GatewayApiCreateUpdateProps {
  resource: any;
  formValidation: boolean;
  model: any;
  ns: string;
  view: string;
  resourceKind?: string;
}

const GatewayApiCreateUpdate: React.FC<GatewayApiCreateUpdateProps> = ({
  resource,
  formValidation,
  model,
  ns,
  view,
  resourceKind = 'Gateway API resource',
}) => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [errorAlertMsg, setErrorAlertMsg] = React.useState('');
  const update = !!resource.metadata.creationTimestamp;

  console.log(`resource: ${resource}`);
  console.log(update);
  console.log(`resource.metadata.creationTimestamp: ${resource.metadata.creationTimestamp}`);

  //TODO: Handle updating an existing Gateway API resource
  const history = useHistory();

  const handleCreateUpdate = async () => {
    if (!formValidation) return; // Early return if form is not valid
    setErrorAlertMsg('');

    console.log(`update: ${update}`);
    console.log(`${resourceKind} resource being sent:`, JSON.stringify(resource, null, 2));

    // Validate required metadata fields for update
    if (update && (!resource.metadata?.uid || !resource.metadata?.resourceVersion)) {
      console.error('Missing required metadata for update:', {
        uid: resource.metadata?.uid,
        resourceVersion: resource.metadata?.resourceVersion,
      });
      setErrorAlertMsg(
        t('Missing required metadata fields (uid, resourceVersion) for {{kind}} update', {
          kind: resourceKind,
        }),
      );
      return;
    }

    try {
      if (update == true) {
        const response = await k8sUpdate({
          model: model,
          data: resource,
          ns: ns,
          name: resource.metadata.name, // Explicitly pass the name for the update
        });
        console.log(`${resourceKind} updated successfully:`, response);
        // Navigate to the Gateway API resource list
        const resourcePath = `${model.apiGroup}~${model.apiVersion}~${model.kind}`;
        history.push(`/k8s/ns/${ns}/${resourcePath}`);
      } else {
        const response = await k8sCreate({
          model: model,
          data: resource,
          ns: ns, //  current namespace
        });
        console.log(`${resourceKind} created successfully:`, response);
        // Navigate to the Gateway API resource list
        const resourcePath = `${model.apiGroup}~${model.apiVersion}~${model.kind}`;
        history.push(`/k8s/ns/${ns}/${resourcePath}`);
      }
    } catch (error) {
      const action = update ? 'updating' : 'creating';
      setErrorAlertMsg(
        t(`Error ${action} {{kind}}: {{error}}`, {
          kind: resourceKind,
          error: error,
        }),
      );
    }
  };

  // If the view is the form view, render create/save/cancel buttons
  if (view === 'form') {
    return (
      <PageSection>
        {errorAlertMsg != '' && (
          <AlertGroup style={{ marginBottom: '16px' }}>
            <Alert
              title={t(update ? `Error updating {{kind}}` : `Error creating {{kind}}`, {
                kind: resourceKind,
              })}
              variant={AlertVariant.danger}
              isInline
            >
              {errorAlertMsg}
            </Alert>
          </AlertGroup>
        )}
        <ActionGroup>
          <Button variant="primary" onClick={handleCreateUpdate} isDisabled={!formValidation}>
            {update ? t(`Save`) : t(`Create`)}
          </Button>
          <Button variant="link" onClick={() => history.goBack()}>
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </PageSection>
    );
  } else {
    return <div />;
  }
};

export default GatewayApiCreateUpdate;

// For backward compatibility, export as GatewayCreateUpdate too
export { GatewayApiCreateUpdate as GatewayCreateUpdate };
