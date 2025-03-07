// 位置：frontend/src/components/ui/index.js
import React from 'react';

export const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  className = '', 
  variant = 'primary' 
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg transition-all duration-300';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-100'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = ({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  className = '',
  ...props 
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-lg 
        bg-gray-700 text-white border-gray-600 
        focus:outline-none focus:ring-2 focus:ring-blue-500 
        ${className}`}
      {...props}
    />
  );
};

export const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
};