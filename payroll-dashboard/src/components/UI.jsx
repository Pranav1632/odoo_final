import { forwardRef } from 'react';

export const Button = forwardRef(({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  disabled, 
  loading,
  ...props 
}, ref) => {
  const baseClasses = 'btn';
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    dark: 'btn-dark',
    ghost: 'btn-ghost',
    link: 'btn-link',
  };
  
  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    icon: 'btn-icon',
  };
  
  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export const Input = forwardRef(({ 
  label, 
  error, 
  className = '', 
  id, 
  ...props 
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">{label}</label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-error flex items-center gap-1" role="alert">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          {error}
        </p>
      )}
    </div>
  );
});
Input.displayName = 'Input';

export const Select = forwardRef(({ 
  label, 
  options = [], 
  placeholder, 
  error, 
  className = '', 
  id, 
  ...props 
}, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${selectId}-error`;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="label">{label}</label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value || opt.id} value={opt.value || opt.id}>
            {opt.label || opt.name}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-error flex items-center gap-1" role="alert">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          {error}
        </p>
      )}
    </div>
  );
});
Select.displayName = 'Select';

export const Badge = ({ children, variant = 'gray', size = 'md', className = '', dot = false, dotColor, ...props }) => {
  const variants = {
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    error: 'bg-error-bg text-error',
    info: 'bg-info-bg text-info',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {dot && <span className={`w-2 h-2 rounded-full ${dotColor || `bg-${color}-500`}`} />}
      {children}
    </span>
  );
};

export const Card = ({ children, className = '', hover = false, ...props }) => (
  <div className={`card ${hover ? 'card-hover' : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-b border-gray-100 dark:border-primary-700 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '', ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-t border-gray-100 dark:border-primary-700 bg-gray-50 dark:bg-primary-900/50 rounded-b-xl ${className}`} {...props}>
    {children}
  </div>
);

export const Avatar = ({ name, src, size = 'md', className = '' }) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };
  
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  const colors = ['bg-ink-900', 'bg-accent-500', 'bg-info', 'bg-success', 'bg-accent-600', 'bg-ink-600', 'bg-warning', 'bg-error'];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  
  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ${className}`} />;
  }
  
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-medium text-white ${colors[colorIndex]} ${className}`}>
      {initials}
    </div>
  );
};

export const Skeleton = ({ className = '', ...props }) => (
  <div className={`skeleton ${className}`} {...props} />
);

export const Table = ({ columns, data, keyField = 'id', onRowClick, selectedKeys = [], onSelectionChange, className = '', emptyMessage = 'No data available', loading = false }) => {
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    if (checked) {
      onSelectionChange?.(data.map(d => d[keyField]));
    } else {
      onSelectionChange?.([]);
    }
  };
  
  const handleRowSelect = (key, e) => {
    e.stopPropagation();
    const newSelection = selectedKeys.includes(key)
      ? selectedKeys.filter(k => k !== key)
      : [...selectedKeys, key];
    onSelectionChange?.(newSelection);
  };
  
  if (loading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width }}><Skeleton className="h-4 w-full" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}><Skeleton className="h-4 w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className="card p-12 text-center">
        <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={`table-container ${className}`}>
      <table className="table" role="grid">
        <thead>
          <tr>
            {onSelectionChange && (
              <th style={{ width: '48px' }}>
                <input type="checkbox" onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500" />
              </th>
            )}
            {columns.map(col => (
              <th key={col.key} style={{ width: col.width }} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const key = row[keyField];
            const isSelected = selectedKeys.includes(key);
            return (
              <tr 
                key={key} 
                className={isSelected ? 'selected' : ''}
                onClick={() => onRowClick?.(row, rowIndex)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                data-testid={`table-row-${key}`}
              >
                {onSelectionChange && (
                  <td className="px-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => handleRowSelect(key, e)}
                      className="w-4 h-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', className = '' }) => {
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  
  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`modal ${sizes[size]} animate-scale-in ${className}`} onClick={e => e.stopPropagation()}>
        {(title || footer) && (
          <div className="modal-header">
            <h3 id="modal-title" className="text-lg font-semibold text-ink-900">{title}</h3>
            <button onClick={onClose} className="btn-icon text-gray-400 hover:text-ink-900" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const Dropdown = ({ trigger, items, align = 'right', className = '' }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={`dropdown ${align === 'left' ? 'left-0' : 'right-0'} animate-scale-in ${className}`} role="menu">
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider && <div className="dropdown-divider" />}
              {!item.divider && (
                <button
                  onClick={() => { item.onClick?.(); setOpen(false); }}
                  className={`dropdown-item w-full text-left ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="menuitem"
                  disabled={item.disabled}
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                  {item.shortcut && <span className="ml-auto text-xs text-gray-400">{item.shortcut}</span>}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);
  
  const types = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info',
  };
  
  const icons = {
    success: <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
    error: <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-7a1 1 0 10-2 0v4a1 1 0 102 0V11zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>,
    warning: <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
    info: <svg className="w-5 h-5 text-info flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>,
  };
  
  return (
    <div className={`${types[type]} animate-slide-in`} role="alert" aria-live="polite">
      <div className="flex-1">
        <p className="font-semibold text-ink-900">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
        <p className="text-sm text-gray-700 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-ink-900 flex-shrink-0" aria-label="Dismiss">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  );
};

export const Tooltip = ({ children, content, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  
  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={`tooltip absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded shadow-lg whitespace-nowrap animate-fade-in
          ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
          ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
          ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
          ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
        `}>
          {content}
        </div>
      )}
    </div>
  );
};

export const Breadcrumb = ({ items }) => (
  <nav className="breadcrumb-bar h-10 sticky top-14 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8" aria-label="Breadcrumb">
    <ol className="flex items-center gap-1.5 text-sm max-w-7xl mx-auto h-full overflow-x-auto scrollbar-thin" role="list">
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-1.5">
          {index > 0 && <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}
          {item.href ? (
            <a href={item.href} className="text-gray-500 hover:text-ink-900 hover:underline">{item.label}</a>
          ) : (
            <span className="text-ink-900 font-semibold" aria-current="page">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export const PageHeader = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
    <div>
      <h1 className="text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] text-ink-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
    {actions && (
      <div className="flex items-center gap-2 sm:ml-auto">
        {actions}
      </div>
    )}
  </div>
);

export const FilterBar = ({ children, className = '' }) => (
  <div className={`flex flex-wrap gap-3 mb-6 ${className}`}>
    {children}
  </div>
);

export const Pagination = ({ currentPage, totalPages, onPageChange, className = '', showPageSize = false, pageSize, onPageSizeChange }) => {
  if (totalPages <= 1) return null;
  
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return (
    <nav className={`flex items-center justify-between gap-4 ${className}`} aria-label="Pagination">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-icon p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-accent-500 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-icon p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          aria-label="Next page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      {showPageSize && (
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="input w-auto py-1.5 text-sm"
          aria-label="Items per page"
        >
          {[10, 20, 50, 100].map(size => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
      )}
    </nav>
  );
};

export const KPICard = ({ title, value, trend, trendLabel, icon, className = '', onClick }) => (
  <div className={`kpi ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>
    <div className="flex items-center justify-between">
      <p className="kpi-label">{title}</p>
      {icon && <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--color-accent-50)', color: 'var(--color-accent-600)' }}>{icon}</div>}
    </div>
    <p className="kpi-value">{value}</p>
    {trend !== undefined && (
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`badge ${trend > 0 ? 'badge-success' : trend < 0 ? 'badge-error' : 'badge-gray'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
        </span>
        <span className="text-xs" style={{ color: 'var(--color-gray-500)' }}>{trendLabel || 'vs last period'}</span>
      </div>
    )}
  </div>
);

export const AlertItem = ({ severity, message, action }) => {
  const severityStyles = {
    error: 'bg-error-bg/60',
    warning: 'bg-warning-bg/60',
    info: 'bg-info-bg/60',
  };
  
  const icons = {
    error: <svg className="w-5 h-5 text-error flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-7a1 1 0 10-2 0v4a1 1 0 102 0V11zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>,
    warning: <svg className="w-5 h-5 text-warning flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
    info: <svg className="w-5 h-5 text-info flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>,
  };
  
  return (
    <div className={`p-4 rounded-lg ${severityStyles[severity]}`}>
      <div className="flex items-start gap-3">
        {icons[severity]}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 dark:text-gray-100">{message}</p>
          {action && (
            <a href={action.href} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent-500 hover:underline">
              {action.label}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, useRef } from 'react';
import React from 'react';