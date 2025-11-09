// Placeholder for Sheet component
import React from "react";

export const Sheet = ({ children, open, onOpenChange }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex",
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        style={{
          backgroundColor: "white",
          width: "300px",
          height: "100%",
          padding: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const SheetTrigger = ({ children, asChild }) => {
  if (asChild) {
    return React.cloneElement(children, {
      onClick: () => {
        // This will be handled by the Sheet component's onOpenChange
      },
    });
  }
  return <button>{children}</button>;
};

export const SheetContent = ({ children, side }) => {
  return <div>{children}</div>;
};
