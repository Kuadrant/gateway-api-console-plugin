import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { Alert, AlertGroup, AlertVariant, Button } from '@patternfly/react-core';
import { useHistory } from 'react-router';

interface GatewayCreateUpdateProps {
  gatewayResource: any;
  formValidation: boolean;
  gatewayModel: any;
  ns: string;
}

const GatewayCreateUpdate: React.FC<GatewayCreateUpdateProps> = ({gatewayResource, formValidation, gatewayModel, ns}) => {
    const { t } = useTranslation('plugin__kuadrant-console-plugin');
    const [errorAlertMsg, setErrorAlertMsg] = React.useState('');

    //TODO: Handle updating an existing gateway
    const history = useHistory();

    const handleCreateUpdate = async () => {
        
        if (!formValidation) return; // Early return if form is not valid
        setErrorAlertMsg('');
        try {
            const response = await k8sCreate({
                model: gatewayModel,
                data: gatewayResource,
                ns: ns //  current namespace
            });
            console.log(`Gateway created successfully:`, response);
            history.push(`/k8s/ns/${ns}/gateway.networking.k8s.io~v1~Gateway`);
        }
        catch (error) {
            setErrorAlertMsg(t(`Error creating gateway: ${error}`));
        }
    };

    return (
        <>
        <div>
        {errorAlertMsg != '' && (
            <AlertGroup>
              <Alert title={t(`Error creating gateway}`)} variant={AlertVariant.danger} isInline>
                {errorAlertMsg}
              </Alert>
            </AlertGroup>
          )}
        </div>
        <div style={{marginLeft: '16px', display: 'flex', gap: '8px'}}>
          <Button onClick={handleCreateUpdate} isDisabled={!formValidation}>
            {t(`Create`)}
          </Button>
          <Button onClick={() => history.push(`/dashboards`)}>
            {t(`Cancel`)}
          </Button>
        </div>
        </>
      );
}

export default GatewayCreateUpdate;