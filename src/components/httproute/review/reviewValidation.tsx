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

// filters validation - detailed validation for each filter type
export const validateFilters = (filters: any[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!filters || filters.length === 0) {
    return { isValid: true, errors, warnings };
  }

  filters.forEach((filter, filterIndex) => {
    // 1. Type - required field
    if (!filter.type || filter.type.trim() === '') {
      errors.push({
        field: `filters[${filterIndex}].type`,
        message: `Filter ${filterIndex + 1}: type is required`,
        severity: 'error',
      });
      return; // Skip further validation if no type
    }

    // 2. Type-specific validation
    switch (filter.type) {
      case 'RequestHeaderModifier':
      case 'ResponseHeaderModifier': {
        const modifierKey =
          filter.type === 'RequestHeaderModifier'
            ? 'requestHeaderModifier'
            : 'responseHeaderModifier';
        const modifier = filter[modifierKey] || {};

        // Check if at least one operation is configured
        const hasAdd = modifier.add && modifier.add.length > 0;
        const hasSet = modifier.set && modifier.set.length > 0;
        const hasRemove = modifier.remove && modifier.remove.length > 0;

        if (!hasAdd && !hasSet && !hasRemove) {
          errors.push({
            field: `filters[${filterIndex}].${modifierKey}`,
            message: `Filter ${filterIndex + 1}: ${
              filter.type
            } must have at least one operation (add, set, or remove)`,
            severity: 'error',
          });
        }

        // Validate add operations
        if (hasAdd) {
          modifier.add.forEach((header: any, headerIndex: number) => {
            if (!header.name || header.name.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].${modifierKey}.add[${headerIndex}].name`,
                message: `Filter ${filterIndex + 1}, Add Header ${
                  headerIndex + 1
                }: name is required`,
                severity: 'error',
              });
            } else {
              // Validate header name format
              const validHeaderName = /^[a-zA-Z0-9\-_]+$/.test(header.name);
              if (!validHeaderName) {
                errors.push({
                  field: `filters[${filterIndex}].${modifierKey}.add[${headerIndex}].name`,
                  message: `Filter ${filterIndex + 1}, Add Header ${
                    headerIndex + 1
                  }: invalid header name format`,
                  severity: 'error',
                });
              }
            }

            if (!header.value || header.value.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].${modifierKey}.add[${headerIndex}].value`,
                message: `Filter ${filterIndex + 1}, Add Header ${
                  headerIndex + 1
                }: value is required`,
                severity: 'error',
              });
            }
          });
        }

        // Validate set operations
        if (hasSet) {
          modifier.set.forEach((header: any, headerIndex: number) => {
            if (!header.name || header.name.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].${modifierKey}.set[${headerIndex}].name`,
                message: `Filter ${filterIndex + 1}, Set Header ${
                  headerIndex + 1
                }: name is required`,
                severity: 'error',
              });
            } else {
              // Validate header name format
              const validHeaderName = /^[a-zA-Z0-9\-_]+$/.test(header.name);
              if (!validHeaderName) {
                errors.push({
                  field: `filters[${filterIndex}].${modifierKey}.set[${headerIndex}].name`,
                  message: `Filter ${filterIndex + 1}, Set Header ${
                    headerIndex + 1
                  }: invalid header name format`,
                  severity: 'error',
                });
              }
            }

            if (!header.value || header.value.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].${modifierKey}.set[${headerIndex}].value`,
                message: `Filter ${filterIndex + 1}, Set Header ${
                  headerIndex + 1
                }: value is required`,
                severity: 'error',
              });
            }
          });
        }

        // Validate remove operations
        if (hasRemove) {
          modifier.remove.forEach((headerName: any, headerIndex: number) => {
            const name = typeof headerName === 'string' ? headerName : headerName?.name;
            if (!name || name.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].${modifierKey}.remove[${headerIndex}]`,
                message: `Filter ${filterIndex + 1}, Remove Header ${
                  headerIndex + 1
                }: name is required`,
                severity: 'error',
              });
            } else {
              // Validate header name format
              const validHeaderName = /^[a-zA-Z0-9\-_]+$/.test(name);
              if (!validHeaderName) {
                errors.push({
                  field: `filters[${filterIndex}].${modifierKey}.remove[${headerIndex}]`,
                  message: `Filter ${filterIndex + 1}, Remove Header ${
                    headerIndex + 1
                  }: invalid header name format`,
                  severity: 'error',
                });
              }
            }
          });
        }

        // Check for duplicate header names within operations
        const checkDuplicates = (headers: any[], operation: string) => {
          const names = headers
            .map((h) => (typeof h === 'string' ? h : h.name)?.toLowerCase())
            .filter(Boolean);
          const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
          if (duplicates.length > 0) {
            warnings.push({
              field: `filters[${filterIndex}].${modifierKey}.${operation}`,
              message: `Filter ${filterIndex + 1}, ${operation}: duplicate header names: ${[
                ...new Set(duplicates),
              ].join(', ')}`,
              severity: 'warning',
            });
          }
        };

        if (hasAdd) checkDuplicates(modifier.add, 'add');
        if (hasSet) checkDuplicates(modifier.set, 'set');
        if (hasRemove) checkDuplicates(modifier.remove, 'remove');
        break;
      }

      case 'RequestRedirect': {
        const redirect = filter.requestRedirect || {};

        // At least one redirect parameter must be specified
        const hasScheme = redirect.scheme && redirect.scheme.trim() !== '';
        const hasHostname = redirect.hostname && redirect.hostname.trim() !== '';
        const hasPort = redirect.port && redirect.port > 0;
        const hasStatusCode = redirect.statusCode && redirect.statusCode > 0;
        const hasPath = redirect.path && redirect.path.type;

        if (!hasScheme && !hasHostname && !hasPort && !hasStatusCode && !hasPath) {
          errors.push({
            field: `filters[${filterIndex}].requestRedirect`,
            message: `Filter ${
              filterIndex + 1
            }: RequestRedirect must specify at least one parameter (scheme, hostname, port, statusCode, or path)`,
            severity: 'error',
          });
        }

        // Validate scheme
        if (hasScheme && !['http', 'https'].includes(redirect.scheme.toLowerCase())) {
          errors.push({
            field: `filters[${filterIndex}].requestRedirect.scheme`,
            message: `Filter ${filterIndex + 1}: scheme must be 'http' or 'https'`,
            severity: 'error',
          });
        }

        // Validate hostname format
        if (hasHostname) {
          const validHostname =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
              redirect.hostname,
            );
          if (!validHostname) {
            errors.push({
              field: `filters[${filterIndex}].requestRedirect.hostname`,
              message: `Filter ${filterIndex + 1}: invalid hostname format`,
              severity: 'error',
            });
          }
        }

        // Validate port range
        if (hasPort && (redirect.port < 1 || redirect.port > 65535)) {
          errors.push({
            field: `filters[${filterIndex}].requestRedirect.port`,
            message: `Filter ${filterIndex + 1}: port must be between 1 and 65535`,
            severity: 'error',
          });
        }

        // Validate status code
        if (hasStatusCode && ![301, 302, 303, 307, 308].includes(redirect.statusCode)) {
          errors.push({
            field: `filters[${filterIndex}].requestRedirect.statusCode`,
            message: `Filter ${
              filterIndex + 1
            }: statusCode must be one of: 301, 302, 303, 307, 308`,
            severity: 'error',
          });
        }

        // Validate path
        if (hasPath) {
          if (!['ReplaceFullPath', 'ReplacePrefixMatch'].includes(redirect.path.type)) {
            errors.push({
              field: `filters[${filterIndex}].requestRedirect.path.type`,
              message: `Filter ${
                filterIndex + 1
              }: path type must be 'ReplaceFullPath' or 'ReplacePrefixMatch'`,
              severity: 'error',
            });
          }

          if (redirect.path.type === 'ReplaceFullPath') {
            if (!redirect.path.replaceFullPath || redirect.path.replaceFullPath.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].requestRedirect.path.replaceFullPath`,
                message: `Filter ${
                  filterIndex + 1
                }: replaceFullPath is required when type is 'ReplaceFullPath'`,
                severity: 'error',
              });
            } else if (!redirect.path.replaceFullPath.startsWith('/')) {
              errors.push({
                field: `filters[${filterIndex}].requestRedirect.path.replaceFullPath`,
                message: `Filter ${filterIndex + 1}: replaceFullPath must start with '/'`,
                severity: 'error',
              });
            }
          }

          if (redirect.path.type === 'ReplacePrefixMatch') {
            if (
              !redirect.path.replacePrefixMatch ||
              redirect.path.replacePrefixMatch.trim() === ''
            ) {
              errors.push({
                field: `filters[${filterIndex}].requestRedirect.path.replacePrefixMatch`,
                message: `Filter ${
                  filterIndex + 1
                }: replacePrefixMatch is required when type is 'ReplacePrefixMatch'`,
                severity: 'error',
              });
            } else if (!redirect.path.replacePrefixMatch.startsWith('/')) {
              errors.push({
                field: `filters[${filterIndex}].requestRedirect.path.replacePrefixMatch`,
                message: `Filter ${filterIndex + 1}: replacePrefixMatch must start with '/'`,
                severity: 'error',
              });
            }
          }
        }
        break;
      }

      case 'URLRewrite': {
        const rewrite = filter.urlRewrite || {};

        // At least one rewrite parameter must be specified
        const hasHostname = rewrite.hostname && rewrite.hostname.trim() !== '';
        const hasPath = rewrite.path && rewrite.path.type;

        if (!hasHostname && !hasPath) {
          errors.push({
            field: `filters[${filterIndex}].urlRewrite`,
            message: `Filter ${
              filterIndex + 1
            }: URLRewrite must specify at least one parameter (hostname or path)`,
            severity: 'error',
          });
        }

        // Validate hostname format
        if (hasHostname) {
          const validHostname =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
              rewrite.hostname,
            );
          if (!validHostname) {
            errors.push({
              field: `filters[${filterIndex}].urlRewrite.hostname`,
              message: `Filter ${filterIndex + 1}: invalid hostname format`,
              severity: 'error',
            });
          }
        }

        // Validate path (same logic as RequestRedirect)
        if (hasPath) {
          if (!['ReplaceFullPath', 'ReplacePrefixMatch'].includes(rewrite.path.type)) {
            errors.push({
              field: `filters[${filterIndex}].urlRewrite.path.type`,
              message: `Filter ${
                filterIndex + 1
              }: path type must be 'ReplaceFullPath' or 'ReplacePrefixMatch'`,
              severity: 'error',
            });
          }

          if (rewrite.path.type === 'ReplaceFullPath') {
            if (!rewrite.path.replaceFullPath || rewrite.path.replaceFullPath.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].urlRewrite.path.replaceFullPath`,
                message: `Filter ${
                  filterIndex + 1
                }: replaceFullPath is required when type is 'ReplaceFullPath'`,
                severity: 'error',
              });
            } else if (!rewrite.path.replaceFullPath.startsWith('/')) {
              errors.push({
                field: `filters[${filterIndex}].urlRewrite.path.replaceFullPath`,
                message: `Filter ${filterIndex + 1}: replaceFullPath must start with '/'`,
                severity: 'error',
              });
            }
          }

          if (rewrite.path.type === 'ReplacePrefixMatch') {
            if (!rewrite.path.replacePrefixMatch || rewrite.path.replacePrefixMatch.trim() === '') {
              errors.push({
                field: `filters[${filterIndex}].urlRewrite.path.replacePrefixMatch`,
                message: `Filter ${
                  filterIndex + 1
                }: replacePrefixMatch is required when type is 'ReplacePrefixMatch'`,
                severity: 'error',
              });
            } else if (!rewrite.path.replacePrefixMatch.startsWith('/')) {
              errors.push({
                field: `filters[${filterIndex}].urlRewrite.path.replacePrefixMatch`,
                message: `Filter ${filterIndex + 1}: replacePrefixMatch must start with '/'`,
                severity: 'error',
              });
            }
          }
        }
        break;
      }

      case 'RequestMirror': {
        const mirror = filter.requestMirror || {};
        const backendRef = mirror.backendRef || {};

        // Service name is required
        if (!backendRef.name || backendRef.name.trim() === '') {
          errors.push({
            field: `filters[${filterIndex}].requestMirror.backendRef.name`,
            message: `Filter ${filterIndex + 1}: RequestMirror service name is required`,
            severity: 'error',
          });
        }

        // Validate port if specified
        if (backendRef.port !== undefined) {
          if (
            typeof backendRef.port !== 'number' ||
            backendRef.port < 1 ||
            backendRef.port > 65535
          ) {
            errors.push({
              field: `filters[${filterIndex}].requestMirror.backendRef.port`,
              message: `Filter ${filterIndex + 1}: RequestMirror port must be between 1 and 65535`,
              severity: 'error',
            });
          }
        }
        break;
      }

      default:
        warnings.push({
          field: `filters[${filterIndex}].type`,
          message: `Filter ${filterIndex + 1}: unknown filter type '${filter.type}'`,
          severity: 'warning',
        });
        break;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// main validation - UPDATE to use detailed filter validation
export const validateCompleteRule = (currentRule: any): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // matches
  if (currentRule.matches && currentRule.matches.length > 0) {
    const matchesValidation = validateMatches(currentRule.matches);
    allErrors.push(...matchesValidation.errors);
    allWarnings.push(...matchesValidation.warnings);
  }

  // UPDATED: detailed filters validation
  if (currentRule.filters && currentRule.filters.length > 0) {
    const filtersValidation = validateFilters(currentRule.filters);
    allErrors.push(...filtersValidation.errors);
    allWarnings.push(...filtersValidation.warnings);
  }

  // backend References validation
  if (currentRule.backendRefs && currentRule.backendRefs.length > 0) {
    const backendRefsValidation = validateBackendRefs(currentRule.backendRefs);
    allErrors.push(...backendRefsValidation.errors);
    allWarnings.push(...backendRefsValidation.warnings);
  }

  // at least 1 section
  const hasMatches = currentRule.matches?.length > 0;
  const hasFilters = currentRule.filters?.length > 0;
  const hasBackendRefs = currentRule.backendRefs?.length > 0;

  if (!hasMatches && !hasFilters && !hasBackendRefs) {
    allErrors.push({
      field: 'rule',
      message: 'rule must have at least one match, filter, or backend reference configured',
      severity: 'error',
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};
