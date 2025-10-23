let idCounter = 0;

export const generateUniqueId = (prefix = 'item'): string => {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}_${Math.random().toString(36).substr(2, 9)}`;
};

// Remove certificates and TLS options when TLS mode is Passthrough
export const removeCertsAndTlsOptionsForPassthrough = (listener: {
  protocol: 'HTTP' | 'HTTPS' | 'TLS' | 'TCP' | 'UDP';
  tlsMode: 'Terminate' | 'Passthrough';
  tlsOptions?: Array<unknown>;
  certificateRefs?: Array<unknown>;
}) => {
  if (listener.protocol === 'HTTPS' || listener.protocol === 'TLS') {
    if (listener.tlsMode === 'Passthrough') {
      return {
        ...listener,
        tlsOptions: [],
        certificateRefs: [],
      };
    }
  }
  return listener;
};
