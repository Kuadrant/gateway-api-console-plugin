import * as React from 'react';

import { useTranslation } from 'react-i18next';

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UploadIcon,
  PendingIcon,
} from '@patternfly/react-icons';

import { Label, Tooltip } from '@patternfly/react-core';

const generateLabelWithTooltip = (labelText, color, icon, tooltipText) => {
  return (
    <Tooltip content={tooltipText} position="top" enableFlip>
      <Label isCompact icon={icon} color={color}>
        {labelText}
      </Label>
    </Tooltip>
  );
};

const getStatusLabel = (obj) => {
  const { t } = useTranslation('plugin__gateway-api-console-plugin');

  const tooltipTexts = {
    // HTTPRoute statuses
    'Route Accepted': t('The HTTPRoute is accepted by at least one parent gateway.'),
    'Route Not Accepted': t('The HTTPRoute is not accepted by any parent gateways.'),
    'Route Unresolved Refs': t('Some references for the HTTPRoute could not be resolved.'),

    // Gateway statuses
    'Gateway Ready': t('The Gateway is accepted, programmed, and ready to serve traffic.'),
    'Gateway Programmed': t('The Gateway is accepted and programmed in the data plane.'),
    'Gateway Accepted': t('The Gateway configuration is accepted but not yet programmed.'),
    'Gateway Not Ready': t('The Gateway has issues and is not ready to serve traffic.'),

    // Common statuses
    Unknown: t('The status of the resource is unknown.'),
    Creating: t('The resource is being processed.'),
  };

  const { kind, status } = obj;

  // For Gateway, check the status.conditions for overall gateway status
  if (kind === 'Gateway') {
    const conditions = status?.conditions || [];

    // If no conditions, the Gateway is likely still being processed
    if (conditions.length === 0) {
      return generateLabelWithTooltip(
        'Creating',
        'cyan',
        <PendingIcon />,
        tooltipTexts['Creating'],
      );
    }

    // Check for standard Gateway API conditions
    const acceptedCondition = conditions.find(
      (cond) => cond.type === 'Accepted' && cond.status === 'True',
    );
    const programmedCondition = conditions.find(
      (cond) => cond.type === 'Programmed' && cond.status === 'True',
    );
    const readyCondition = conditions.find(
      (cond) => cond.type === 'Ready' && cond.status === 'True',
    );

    // Determine status based on conditions (in order of preference)
    if (readyCondition || (acceptedCondition && programmedCondition)) {
      return generateLabelWithTooltip(
        'Ready',
        'green',
        <CheckCircleIcon />,
        tooltipTexts['Gateway Ready'],
      );
    } else if (programmedCondition) {
      return generateLabelWithTooltip(
        'Programmed',
        'blue',
        <CheckCircleIcon />,
        tooltipTexts['Gateway Programmed'],
      );
    } else if (acceptedCondition) {
      return generateLabelWithTooltip(
        'Accepted',
        'purple',
        <UploadIcon />,
        tooltipTexts['Gateway Accepted'],
      );
    } else {
      // Check for false conditions to show specific errors
      const hasErrorConditions = conditions.some(
        (cond) =>
          (cond.type === 'Accepted' || cond.type === 'Programmed' || cond.type === 'Ready') &&
          cond.status === 'False',
      );

      if (hasErrorConditions) {
        return generateLabelWithTooltip(
          'Not Ready',
          'red',
          <ExclamationTriangleIcon />,
          tooltipTexts['Gateway Not Ready'],
        );
      } else {
        return generateLabelWithTooltip(
          'Unknown',
          'orange',
          <ExclamationTriangleIcon />,
          tooltipTexts['Unknown'],
        );
      }
    }
  }

  // For HTTPRoute, check the status.parents for gateway attachment status
  if (kind === 'HTTPRoute') {
    const parents = status?.parents || [];

    // If no status.parents, the HTTPRoute is likely still being processed
    if (parents.length === 0) {
      return generateLabelWithTooltip(
        'Creating',
        'cyan',
        <PendingIcon />,
        tooltipTexts['Creating'],
      );
    }

    // Check how many parents have accepted this HTTPRoute
    const acceptedParents = parents.filter((parent) =>
      parent.conditions?.some((cond) => cond.type === 'Accepted' && cond.status === 'True'),
    );

    const acceptedCount = acceptedParents.length;

    // Check if all references are resolved
    const hasUnresolvedRefs = parents.some((parent) =>
      parent.conditions?.some((cond) => cond.type === 'ResolvedRefs' && cond.status === 'False'),
    );

    if (hasUnresolvedRefs) {
      return generateLabelWithTooltip(
        'Unresolved Refs',
        'orange',
        <ExclamationTriangleIcon />,
        tooltipTexts['Route Unresolved Refs'],
      );
    }

    // Determine status based on acceptance rate
    if (acceptedCount > 0) {
      return generateLabelWithTooltip(
        'Accepted',
        'green',
        <CheckCircleIcon />,
        tooltipTexts['Route Accepted'],
      );
    } else {
      return generateLabelWithTooltip(
        'Not Accepted',
        'red',
        <ExclamationTriangleIcon />,
        tooltipTexts['Route Not Accepted'],
      );
    }
  }

  // For other resource types, return unknown status
  return generateLabelWithTooltip(
    'Unknown',
    'grey',
    <ExclamationTriangleIcon />,
    tooltipTexts['Unknown'],
  );
};

export { getStatusLabel };
