"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

/**
 * A reusable component to display when there is no data to show.
 *
 * @param {object} props - The component props.
 * @param {string} props.title - The main title for the empty state.
 * @param {string} [props.description] - An optional description.
 * @param {React.ReactNode} [props.icon] - An optional icon to display.
 * @param {object} [props.action] - An optional action button.
 * @param {string} props.action.label - The label for the action button.
 * @param {function} props.action.onClick - The function to call when the button is clicked.
 * @returns {React.ReactNode} The rendered empty state component.
 */
export function EmptyState({ title, description, icon, action }) {
  return (
    <div className="text-center py-16">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground mt-2">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}