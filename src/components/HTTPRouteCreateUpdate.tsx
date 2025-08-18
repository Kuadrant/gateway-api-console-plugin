import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { k8sCreate, k8sUpdate } from '@openshift-console/dynamic-plugin-sdk';
import { Alert, AlertGroup, AlertVariant, Button } from '@patternfly/react-core';
import { useHistory } from 'react-router';

interface HTTPRouteCreateUpdateProps {
  httpRouteResource: any;
  formValidation: boolean;
  httpRouteModel: any;
  ns: string;
  isEdit?: boolean;
}

const HTTPRouteCreateUpdate: React.FC<HTTPRouteCreateUpdateProps> = ({
  httpRouteResource,
  formValidation,
  httpRouteModel,
  ns,
  isEdit = false,
}) => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');
  const [errorAlertMsg, setErrorAlertMsg] = React.useState('');
  const history = useHistory();

  const handleCreateUpdate = async () => {
    if (!formValidation) return;
    setErrorAlertMsg('');

    try {
      if (isEdit) {
        const response = await k8sUpdate({
          model: httpRouteModel,
          data: httpRouteResource,
        });
        console.log('HTTPRoute updated successfully:', response);
      } else {
        const response = await k8sCreate({
          model: httpRouteModel,
          data: httpRouteResource,
          ns: ns,
        });
        console.log('HTTPRoute created successfully:', response);
      }

      history.push(`/k8s/ns/${ns}/gateway.networking.k8s.io~v1~HTTPRoute`);
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} HTTPRoute:`, error);
      setErrorAlertMsg(t(`Error ${isEdit ? 'updating' : 'creating'} HTTPRoute: ${error.message}`));
    }
  };

  return (
    <>
      <div>
        {errorAlertMsg && (
          <AlertGroup>
            <Alert
              title={t(`Error ${isEdit ? 'updating' : 'creating'} HTTPRoute`)}
              variant={AlertVariant.danger}
              isInline
            >
              {errorAlertMsg}
            </Alert>
          </AlertGroup>
        )}
      </div>
      <Button onClick={handleCreateUpdate} isDisabled={!formValidation}>
        {isEdit ? t('Save') : t('Create')}
      </Button>
    </>
  );
};

export default HTTPRouteCreateUpdate;
