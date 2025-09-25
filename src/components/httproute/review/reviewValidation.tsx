import { HTTPRouteMatch } from '../HTTPRouteModel';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// generic interface for headers and query params
interface HTTPRouteParameter {
  id: string;
  type: string;
  name: string;
  value: string;
}

// generic validation for headers and query parameters
export const validateHTTPRouteParameters = (
  parameters: HTTPRouteParameter[],
  matchIndex: number,
  parameterType: 'headers' | 'queryParams',
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const displayName = parameterType === 'headers' ? 'Header' : 'Query Parameter';
  const fieldPrefix = parameterType;

  parameters.forEach((param, paramIndex) => {
    // name - required field
    if (!param.name || param.name.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].${fieldPrefix}[${paramIndex}].name`,
        message: `Match ${matchIndex + 1}, ${displayName} ${paramIndex + 1}: Name is required`,
        severity: 'error',
      });
    } else {
      // additional validation for headers (only for headers)
      if (parameterType === 'headers') {
        const validHeaderName = /^[a-zA-Z0-9\-_]+$/.test(param.name);
        if (!validHeaderName) {
          errors.push({
            field: `matches[${matchIndex}].${fieldPrefix}[${paramIndex}].name`,
            message: `Match ${matchIndex + 1}, ${displayName} ${
              paramIndex + 1
            }: Invalid header name format`,
            severity: 'error',
          });
        }
      }
    }

    // value - required field
    if (!param.value || param.value.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].${fieldPrefix}[${paramIndex}].value`,
        message: `Match ${matchIndex + 1}, ${displayName} ${paramIndex + 1}: Value is required`,
        severity: 'error',
      });
    }

    //  type - must be valid
    if (!param.type || !['Exact', 'RegularExpression'].includes(param.type)) {
      errors.push({
        field: `matches[${matchIndex}].${fieldPrefix}[${paramIndex}].type`,
        message: `Match ${matchIndex + 1}, ${displayName} ${
          paramIndex + 1
        }: Type must be 'Exact' or 'RegularExpression'`,
        severity: 'error',
      });
    }

    // regexp validation if type is regularexpression
    if (param.type === 'RegularExpression' && param.value) {
      try {
        new RegExp(param.value);
      } catch (e) {
        errors.push({
          field: `matches[${matchIndex}].${fieldPrefix}[${paramIndex}].value`,
          message: `Match ${matchIndex + 1}, ${displayName} ${
            paramIndex + 1
          }: Invalid regular expression`,
          severity: 'error',
        });
      }
    }
  });

  // check for duplicate names
  const paramNames = parameters.map((p) => p.name.toLowerCase()).filter(Boolean);
  const duplicateNames = paramNames.filter((name, index) => paramNames.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    warnings.push({
      field: `matches[${matchIndex}].${fieldPrefix}`,
      message: `Match ${matchIndex + 1}: Duplicate ${
        parameterType === 'headers' ? 'header' : 'query parameter'
      } names: ${[...new Set(duplicateNames)].join(', ')}`,
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// matches validation - uses generic function
export const validateMatches = (matches: HTTPRouteMatch[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (matches.length === 0) {
    return { isValid: true, errors, warnings };
  }

  matches.forEach((match, matchIndex) => {
    // path type - required field
    if (!match.pathType || match.pathType.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].pathType`,
        message: `Match ${matchIndex + 1}: Path type is required`,
        severity: 'error',
      });
    }

    // path value - must be valid
    if (!match.pathValue || match.pathValue.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].pathValue`,
        message: `Match ${matchIndex + 1}: Path value is required`,
        severity: 'error',
      });
    } else if (!match.pathValue.startsWith('/')) {
      errors.push({
        field: `matches[${matchIndex}].pathValue`,
        message: `Match ${matchIndex + 1}: Path must start with '/'`,
        severity: 'error',
      });
    }

    // method - required field
    if (!match.method || match.method.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].method`,
        message: `Match ${matchIndex + 1}: HTTP method is required`,
        severity: 'error',
      });
    }

    // headers validation via generic function
    if (match.headers && match.headers.length > 0) {
      const headerValidation = validateHTTPRouteParameters(
        match.headers as HTTPRouteParameter[],
        matchIndex,
        'headers',
      );
      errors.push(...headerValidation.errors);
      warnings.push(...headerValidation.warnings);
    }

    // query parameters validation via generic function
    if (match.queryParams && match.queryParams.length > 0) {
      const queryParamValidation = validateHTTPRouteParameters(
        match.queryParams as HTTPRouteParameter[],
        matchIndex,
        'queryParams',
      );
      errors.push(...queryParamValidation.errors);
      warnings.push(...queryParamValidation.warnings);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

//backend references validation - for real backend refs
export const validateBackendRefs = (backendRefs: any[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!backendRefs || backendRefs.length === 0) {
    return { isValid: true, errors, warnings };
  }

  backendRefs.forEach((ref, index) => {
    // ervice name - required field
    if (!ref.serviceName || ref.serviceName.trim() === '') {
      errors.push({
        field: `backendRefs[${index}].serviceName`,
        message: `Backend Reference ${index + 1}: Service name is required`,
        severity: 'error',
      });
    }

    // 2. Service Namespace
    if (!ref.serviceNamespace || ref.serviceNamespace.trim() === '') {
      errors.push({
        field: `backendRefs[${index}].serviceNamespace`,
        message: `Backend Reference ${index + 1}: Service namespace is required`,
        severity: 'error',
      });
    }

    // 3. Port
    if (!ref.port || ref.port <= 0) {
      errors.push({
        field: `backendRefs[${index}].port`,
        message: `Backend Reference ${index + 1}: Valid port is required (must be > 0)`,
        severity: 'error',
      });
    }

    // 4. Weight
    if (!ref.weight || ref.weight < 1 || ref.weight > 1000000) {
      errors.push({
        field: `backendRefs[${index}].weight`,
        message: `Backend Reference ${index + 1}: Weight must be between 1 and 1,000,000`,
        severity: 'error',
      });
    }

    // 5. Cross-namespace warning (TODO: add detailed filter validation when needed)
    // if (ref.serviceNamespace !== currentNamespace) {
    //   warnings.push({
    //     field: `backendRefs[${index}].serviceNamespace`,
    //     message: `Backend Reference ${index + 1}: Cross-namespace reference may require ReferenceGrant`,
    //     severity: 'warning'
    //   });
    // }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// main validatione
export const validateCompleteRule = (currentRule: any): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // Matches
  if (currentRule.matches && currentRule.matches.length > 0) {
    const matchesValidation = validateMatches(currentRule.matches);
    allErrors.push(...matchesValidation.errors);
    allWarnings.push(...matchesValidation.warnings);
  }

  // 2️  Filters basic
  if (currentRule.filters && currentRule.filters.length > 0) {
    const hasInvalidFilters = currentRule.filters.some((filter: any) => !filter.type);
    if (hasInvalidFilters) {
      allErrors.push({
        field: 'filters',
        message: 'Some filters are missing required type',
        severity: 'error',
      });
    }
  }

  // legsy for time
  if (currentRule.serviceName || currentRule.servicePort) {
    if (!currentRule.serviceName || currentRule.serviceName.trim() === '') {
      allErrors.push({
        field: 'serviceName',
        message: 'Backend service name is required',
        severity: 'error',
      });
    }

    if (!currentRule.servicePort || currentRule.servicePort <= 0) {
      allErrors.push({
        field: 'servicePort',
        message: 'Backend service port must be greater than 0',
        severity: 'error',
      });
    }
  }

  // new Backend References val
  if (currentRule.backendRefs && currentRule.backendRefs.length > 0) {
    const backendRefsValidation = validateBackendRefs(currentRule.backendRefs);
    allErrors.push(...backendRefsValidation.errors);
    allWarnings.push(...backendRefsValidation.warnings);
  }

  // at lest 1 section
  const hasMatches = currentRule.matches?.length > 0;
  const hasFilters = currentRule.filters?.length > 0;
  const hasLegacyBackend = !!(currentRule.serviceName && currentRule.servicePort > 0);
  const hasBackendRefs = currentRule.backendRefs?.length > 0;

  if (!hasMatches && !hasFilters && !hasLegacyBackend && !hasBackendRefs) {
    allErrors.push({
      field: 'rule',
      message: 'Rule must have at least one match, filter, or backend reference configured',
      severity: 'error',
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};
