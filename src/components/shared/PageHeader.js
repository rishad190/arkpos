"use client";

import React from 'react';

/**
 * A reusable page header component.
 *
 * @param {object} props - The component props.
 * @param {string} props.title - The main title to display on the page.
 * @param {string} [props.description] - An optional description to show below the title.
 * @param {React.ReactNode} [props.actions] - Optional action elements, like buttons, to display on the right.
 * @returns {React.ReactNode} The rendered page header.
 */
export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" role="heading" aria-level="1">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1" role="doc-subtitle">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto" role="toolbar">
          {actions}
        </div>
      )}
    </div>
  );
}