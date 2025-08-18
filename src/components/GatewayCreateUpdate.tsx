import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { k8sCreate, k8sUpdate } from '@openshift-console/dynamic-plugin-sdk';
import { Alert, AlertGroup, AlertVariant, Button } from '@patternfly/react-core';
import { useHistory } from 'react-router';

interface GatewayCreateUpdateProps {
  gatewayResource: any;
  formValidation: boolean;
  gatewayModel: any;
  ns: string;
  view: string;
}

const GatewayCreateUpdate: React.FC<GatewayCreateUpdateProps> = ({gatewayResource, formValidation, gatewayModel, ns, view}) => {
    const { t } = useTranslation('plugin__kuadrant-console-plugin');
    const [errorAlertMsg, setErrorAlertMsg] = React.useState('');
    const update = !!gatewayResource.metadata.creationTimestamp;

    console.log(`gatewayResource: ${gatewayResource}`);
    console.log(update)
    console.log(`gatewayResource.metadata.creationTimestamp: ${gatewayResource.metadata.creationTimestamp}`);

    //TODO: Handle updating an existing gateway
    const history = useHistory();

    const handleCreateUpdate = async () => {
        
      if (!formValidation) return; // Early return if form is not valid
      setErrorAlertMsg('');

      console.log(`update: ${update}`);
      console.log(`Gateway resource being sent:`, JSON.stringify(gatewayResource, null, 2));

      // Validate required metadata fields for update
      if (update && (!gatewayResource.metadata?.uid || !gatewayResource.metadata?.resourceVersion)) {
        console.error('Missing required metadata for update:', {
          uid: gatewayResource.metadata?.uid,
          resourceVersion: gatewayResource.metadata?.resourceVersion
        });
        setErrorAlertMsg(t('Missing required metadata fields (uid, resourceVersion) for gateway update'));
        return;
      }

      try {
        if (update == true) {
          const response = await k8sUpdate({
              model: gatewayModel,
              data: gatewayResource,
              ns: ns,
              name: gatewayResource.metadata.name  // Explicitly pass the name for the update
          });
          console.log(`Gateway updated successfully:`, response);
          history.push(`/k8s/ns/${ns}/gateway.networking.k8s.io~v1~Gateway`);
      }
      else {
        const response = await k8sCreate({
          model: gatewayModel,
          data: gatewayResource,
          ns: ns //  current namespace
      });
      console.log(`Gateway created successfully:`, response);
      history.push(`/k8s/ns/${ns}/gateway.networking.k8s.io~v1~Gateway`);
      }

      }
      catch (error) {
        const action = update ? 'updating' : 'creating';
        setErrorAlertMsg(t(`Error ${action} gateway: ${error}`));
      }
    };

    // If the view is the yaml view, render new create/save/cancel buttons
    if (view === 'form') {
    return (
        <>
        <div>
        {errorAlertMsg != '' && (
            <AlertGroup>
              <Alert title={t(update ? `Error updating gateway` : `Error creating gateway`)} variant={AlertVariant.danger} isInline>
                {errorAlertMsg}
              </Alert>
            </AlertGroup>
          )}
        </div>
        <div style={{marginLeft: '16px', display: 'flex', gap: '8px'}}>
          <Button onClick={handleCreateUpdate} isDisabled={!formValidation}>
          {update ? t(`Save`) : t(`Create`)}
          </Button>
          <Button onClick={() => history.push(`/dashboards`)}>
            {t(`Cancel`)}
          </Button>
        </div>
        </>
      );
    }
    else {
      return <div />;
    }
}

export default GatewayCreateUpdate;