// src/components/httproute/review/reviewValidation.tsx

import { HTTPRouteMatch, HTTPRouteHeader, HTTPRouteQueryParam } from '../HTTPRouteModel';

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

//  matches validati  detailed
export const validateMatches = (matches: HTTPRouteMatch[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (matches.length === 0) {
    return { isValid: true, errors, warnings };
  }

  matches.forEach((match, matchIndex) => {
    // 1. path type - required field
    if (!match.pathType || match.pathType.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].pathType`,
        message: `Match ${matchIndex + 1}: Path type is required`,
        severity: 'error',
      });
    }

    // 2 path value - must be valid
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

    // 3 method - required field
    if (!match.method || match.method.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].method`,
        message: `Match ${matchIndex + 1}: HTTP method is required`,
        severity: 'error',
      });
    }

    //  4 headers validation
    if (match.headers && match.headers.length > 0) {
      const headerValidation = validateHeaders(match.headers, matchIndex);
      errors.push(...headerValidation.errors);
      warnings.push(...headerValidation.warnings);
    }

    // 5 query parameters validation
    if (match.queryParams && match.queryParams.length > 0) {
      const queryParamValidation = validateQueryParams(match.queryParams, matchIndex);
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

// headers validation  detailed
export const validateHeaders = (
  headers: HTTPRouteHeader[],
  matchIndex: number,
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  headers.forEach((header, headerIndex) => {
    // 1 name - required field
    if (!header.name || header.name.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].headers[${headerIndex}].name`,
        message: `Match ${matchIndex + 1}, Header ${headerIndex + 1}: Name is required`,
        severity: 'error',
      });
    } else {
      // check http header name validity
      const validHeaderName = /^[a-zA-Z0-9\-_]+$/.test(header.name);
      if (!validHeaderName) {
        errors.push({
          field: `matches[${matchIndex}].headers[${headerIndex}].name`,
          message: `Match ${matchIndex + 1}, Header ${headerIndex + 1}: Invalid header name format`,
          severity: 'error',
        });
      }
    }

    //  value - required field
    if (!header.value || header.value.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].headers[${headerIndex}].value`,
        message: `Match ${matchIndex + 1}, Header ${headerIndex + 1}: Value is required`,
        severity: 'error',
      });
    }

    //  type - must be valid
    if (!header.type || !['Exact', 'RegularExpression'].includes(header.type)) {
      errors.push({
        field: `matches[${matchIndex}].headers[${headerIndex}].type`,
        message: `Match ${matchIndex + 1}, Header ${
          headerIndex + 1
        }: Type must be 'Exact' or 'RegularExpression'`,
        severity: 'error',
      });
    }

    // regexp validation if type is regularExpression
    if (header.type === 'RegularExpression' && header.value) {
      try {
        new RegExp(header.value);
      } catch (e) {
        errors.push({
          field: `matches[${matchIndex}].headers[${headerIndex}].value`,
          message: `Match ${matchIndex + 1}, Header ${headerIndex + 1}: Invalid regular expression`,
          severity: 'error',
        });
      }
    }
  });

  // check for duplicate header names
  const headerNames = headers.map((h) => h.name.toLowerCase()).filter(Boolean);
  const duplicateNames = headerNames.filter((name, index) => headerNames.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    warnings.push({
      field: `matches[${matchIndex}].headers`,
      message: `Match ${matchIndex + 1}: Duplicate header names detected: ${[
        ...new Set(duplicateNames),
      ].join(', ')}`,
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// query parameters valida detailed
export const validateQueryParams = (
  queryParams: HTTPRouteQueryParam[],
  matchIndex: number,
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  queryParams.forEach((queryParam, queryParamIndex) => {
    // 1 name - required field
    if (!queryParam.name || queryParam.name.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].queryParams[${queryParamIndex}].name`,
        message: `Match ${matchIndex + 1}, Query Param ${queryParamIndex + 1}: Name is required`,
        severity: 'error',
      });
    }

    // 2 value - required field
    if (!queryParam.value || queryParam.value.trim() === '') {
      errors.push({
        field: `matches[${matchIndex}].queryParams[${queryParamIndex}].value`,
        message: `Match ${matchIndex + 1}, Query Param ${queryParamIndex + 1}: Value is required`,
        severity: 'error',
      });
    }

    // 3 type validation
    if (!queryParam.type || !['Exact', 'RegularExpression'].includes(queryParam.type)) {
      errors.push({
        field: `matches[${matchIndex}].queryParams[${queryParamIndex}].type`,
        message: `Match ${matchIndex + 1}, Query Param ${
          queryParamIndex + 1
        }: Type must be 'Exact' or 'RegularExpression'`,
        severity: 'error',
      });
    }

    // 4 regexp validation
    if (queryParam.type === 'RegularExpression' && queryParam.value) {
      try {
        new RegExp(queryParam.value);
      } catch (e) {
        errors.push({
          field: `matches[${matchIndex}].queryParams[${queryParamIndex}].value`,
          message: `Match ${matchIndex + 1}, Query Param ${
            queryParamIndex + 1
          }: Invalid regular expression`,
          severity: 'error',
        });
      }
    }
  });

  // 5 check for duplicates
  const queryParamNames = queryParams.map((q) => q.name.toLowerCase()).filter(Boolean);
  const duplicateNames = queryParamNames.filter(
    (name, index) => queryParamNames.indexOf(name) !== index,
  );
  if (duplicateNames.length > 0) {
    warnings.push({
      field: `matches[${matchIndex}].queryParams`,
      message: `Match ${matchIndex + 1}: Duplicate query parameter names: ${[
        ...new Set(duplicateNames),
      ].join(', ')}`,
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// main validation function for the whole rule
export const validateCompleteRule = (currentRule: any): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  //  Matches
  if (currentRule.matches && currentRule.matches.length > 0) {
    const matchesValidation = validateMatches(currentRule.matches);
    allErrors.push(...matchesValidation.errors);
    allWarnings.push(...matchesValidation.warnings);
  }

  //  Filters
  if (currentRule.filters && currentRule.filters.length > 0) {
    // toDO :add real validatione to filter
    const hasInvalidFilters = currentRule.filters.some((filter: any) => !filter.type);
    if (hasInvalidFilters) {
      allErrors.push({
        field: 'filters',
        message: 'Some filters are missing required type',
        severity: 'error',
      });
    }
  }

  // Backend Service (legacy)
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

  // at least 1 section validation
  const hasMatches = currentRule.matches?.length > 0;
  const hasFilters = currentRule.filters?.length > 0;
  const hasBackendService = !!(currentRule.serviceName && currentRule.servicePort > 0);

  if (!hasMatches && !hasFilters && !hasBackendService) {
    allErrors.push({
      field: 'rule',
      message: 'Rule must have at least one match, filter, or backend service configured',
      severity: 'error',
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};
